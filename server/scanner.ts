import {
  getWebsites,
  getWebsiteById,
  updateWebsite,
  upsertProduct,
  getAlerts,
  createAlert,
  updateAlert,
  getSettings,
} from './db';
import { scrapeWebsite, ScrapeResult } from './scraper';
import { sendSaleAlertNotification } from './telegram';
import { Alert } from '../src/types';

export interface ScanExecutionResult {
  websiteId: string;
  websiteName: string;
  success: boolean;
  productsFound: number;
  newProducts: number;
  newSalesDetected: number;
  stableDiscountsIgnored: number;
  qualifyingDeals: number;
  alertsCreated: number;
  diagnostics: ScrapeResult['diagnostics'];
  error?: string;
}

export async function executeWebsiteScan(websiteId: string): Promise<ScanExecutionResult> {
  const website = getWebsiteById(websiteId);
  if (!website) {
    throw new Error(`Website with ID ${websiteId} not found.`);
  }

  const settings = getSettings();
  const threshold = website.discount_threshold || settings.default_discount_threshold || 50;
  const now = new Date();

  console.log(`[Scanner] Starting scan for ${website.name} (${website.url})...`);

  try {
    const scrapeResult = await scrapeWebsite(website.url, website.name);

    let newProductsCount = 0;
    let newSalesDetectedCount = 0;
    let stableDiscountsIgnoredCount = 0;
    let alertsCreatedCount = 0;

    const existingAlerts = getAlerts();

    for (const item of scrapeResult.products) {
      const {
        product,
        isNew,
        isPriceDrop,
        isStableDiscount,
        previousPrice,
        regularPrice,
        newDiscountPercentage,
      } = upsertProduct({
        website_id: website.id,
        website_name: website.name,
        name: item.name,
        product_url: item.product_url,
        image_url: item.image_url,
        currency: item.currency || settings.currency || 'PKR',
        regular_price: item.original_price,
        original_price: item.original_price,
        current_price: item.current_price,
        discount_percentage: item.discount_percentage,
        is_verified_discount: item.is_verified_discount,
        availability: item.availability,
      });

      if (isNew) newProductsCount++;

      // 1. Must qualify based on regular (original) price, not already-discounted prices
      const meetsThreshold = product.is_verified_discount && newDiscountPercentage >= threshold;

      if (!meetsThreshold) {
        continue;
      }

      // Keyword filter check: restrict alerts to specific categories or product names
      if (website.keywords && website.keywords.length > 0) {
        const prodNameLower = product.name.toLowerCase();
        const matchesKeyword = website.keywords.some(kw =>
          prodNameLower.includes(kw.trim().toLowerCase())
        );
        if (!matchesKeyword) {
          // Excluded by keyword filter (e.g. user only wants 'shoes' or 'winter jacket')
          continue;
        }
      }

      // 2. Ignore stable already-discounted prices
      // If a product was previously discounted and the price history shows a stable discounted price,
      // do not count it as a new sale.
      if (isStableDiscount) {
        stableDiscountsIgnoredCount++;
        continue;
      }

      // 3. Only flag when there is a clear drop from regular price or a new price drop
      const isClearDrop = isNew || isPriceDrop;
      if (!isClearDrop) {
        continue;
      }

      // 4. Deduplication: Has an alert already been created for this exact product at this price or lower?
      const existingAlert = existingAlerts.find(a => a.product_id === product.id);
      if (existingAlert && existingAlert.sale_price <= product.current_price) {
        // Price hasn't dropped below previous alert
        stableDiscountsIgnoredCount++;
        continue;
      }

      // Real New Sale Identified!
      newSalesDetectedCount++;

      const newAlert: Alert = createAlert({
        product_id: product.id,
        website_id: website.id,
        website_name: website.name,
        product_name: product.name,
        product_url: product.product_url,
        image_url: product.image_url,
        currency: product.currency,
        regular_price: regularPrice,
        original_price: regularPrice,
        sale_price: product.current_price,
        previous_price: previousPrice,
        discount_percentage: newDiscountPercentage,
        notification_sent_at: null,
      });

      alertsCreatedCount++;

      // Dispatch Telegram notification if configured
      if (settings.notification_enabled && settings.telegram_bot_token && settings.telegram_chat_id) {
        sendSaleAlertNotification(settings, newAlert)
          .then(res => {
            if (res.success) {
              updateAlert(newAlert.id, { notification_sent_at: new Date().toISOString() });
              console.log(`[Telegram] Successfully sent alert for ${product.name} (-${newDiscountPercentage}%)`);
            } else {
              console.warn(`[Telegram] Alert sending failed: ${res.error}`);
            }
          })
          .catch(e => console.error('[Telegram] Alert error:', e));
      }
    }

    // Calculate next scan time
    const nextScan = new Date(now.getTime() + (website.scan_frequency || 3) * 60 * 60 * 1000);

    // Update website state
    updateWebsite(website.id, {
      name: website.name || scrapeResult.storeName,
      status: 'active',
      last_scanned_at: now.toISOString(),
      next_scan_at: nextScan.toISOString(),
      error_message: null,
      favicon: scrapeResult.favicon || website.favicon,
    });

    console.log(
      `[Scanner] Completed scan for ${website.name}: ${scrapeResult.products.length} found, ${newProductsCount} new items, ${newSalesDetectedCount} real new sales detected, ${stableDiscountsIgnoredCount} stable discounts ignored, ${alertsCreatedCount} alerts dispatched.`
    );

    return {
      websiteId: website.id,
      websiteName: website.name,
      success: true,
      productsFound: scrapeResult.products.length,
      newProducts: newProductsCount,
      newSalesDetected: newSalesDetectedCount,
      stableDiscountsIgnored: stableDiscountsIgnoredCount,
      qualifyingDeals: newSalesDetectedCount,
      alertsCreated: alertsCreatedCount,
      diagnostics: scrapeResult.diagnostics,
    };
  } catch (err: any) {
    console.error(`[Scanner] Error scanning ${website.url}:`, err);
    updateWebsite(website.id, {
      status: 'error',
      last_scanned_at: now.toISOString(),
      error_message: err.message || 'Scrape failed',
    });

    return {
      websiteId: website.id,
      websiteName: website.name,
      success: false,
      productsFound: 0,
      newProducts: 0,
      newSalesDetected: 0,
      stableDiscountsIgnored: 0,
      qualifyingDeals: 0,
      alertsCreated: 0,
      diagnostics: {
        strategyUsed: 'Error',
        totalFound: 0,
        withDiscounts: 0,
        durationMs: 0,
        message: err.message,
      },
      error: err.message,
    };
  }
}

/**
 * Scan all websites marked active
 */
export async function scanAllWebsites(): Promise<ScanExecutionResult[]> {
  const websites = getWebsites().filter(w => w.status === 'active');
  const results: ScanExecutionResult[] = [];

  for (const site of websites) {
    try {
      const res = await executeWebsiteScan(site.id);
      results.push(res);
      // Gentle pause between sites
      await new Promise(r => setTimeout(r, 1000));
    } catch (e: any) {
      results.push({
        websiteId: site.id,
        websiteName: site.name,
        success: false,
        productsFound: 0,
        newProducts: 0,
        newSalesDetected: 0,
        stableDiscountsIgnored: 0,
        qualifyingDeals: 0,
        alertsCreated: 0,
        diagnostics: {
          strategyUsed: 'Error',
          totalFound: 0,
          withDiscounts: 0,
          durationMs: 0,
          message: e.message,
        },
        error: e.message,
      });
    }
  }

  return results;
}

let schedulerTimer: NodeJS.Timeout | null = null;

export function startBackgroundScheduler() {
  if (schedulerTimer) return;

  console.log('[Scheduler] Background scanner worker started (checking every 60s)...');
  schedulerTimer = setInterval(async () => {
    try {
      const settings = getSettings();
      if (!settings.auto_scan_enabled) return;

      const websites = getWebsites().filter(w => w.status === 'active');
      const now = new Date();

      for (const site of websites) {
        const isDue = !site.next_scan_at || new Date(site.next_scan_at) <= now;
        if (isDue) {
          console.log(`[Scheduler] Site ${site.name} is due for scheduled scan.`);
          await executeWebsiteScan(site.id);
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error in background scan loop:', err);
    }
  }, 60 * 1000);
}
