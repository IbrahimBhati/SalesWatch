import fs from 'node:fs';
import path from 'node:path';
import { Website, Product, PriceHistory, Alert, AppSettings, DashboardStats } from '../src/types';

interface DatabaseSchema {
  websites: Website[];
  products: Product[];
  price_history: PriceHistory[];
  alerts: Alert[];
  settings: AppSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

const DEFAULT_SETTINGS: AppSettings = {
  default_discount_threshold: 50,
  default_scan_frequency: 3,
  telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
  telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
  notification_enabled: true,
  currency: 'PKR',
  auto_scan_enabled: true,
  scan_failure_notifications: true,
};

let inMemoryDb: DatabaseSchema = {
  websites: [],
  products: [],
  price_history: [],
  alerts: [],
  settings: DEFAULT_SETTINGS,
};

// Initialize file persistence
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function initDatabase() {
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      inMemoryDb = {
        websites: parsed.websites || [],
        products: parsed.products || [],
        price_history: parsed.price_history || [],
        alerts: parsed.alerts || [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      };
      console.log(`[Database] Loaded ${inMemoryDb.websites.length} websites and ${inMemoryDb.products.length} products.`);
    } catch (e) {
      console.error('[Database] Failed to read database.json, starting with fresh store:', e);
      persistDatabase();
    }
  } else {
    persistDatabase();
  }
}

function persistDatabase() {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to persist data to disk:', err);
  }
}

// Websites
export function getWebsites(): Website[] {
  return inMemoryDb.websites;
}

export function getWebsiteById(id: string): Website | undefined {
  return inMemoryDb.websites.find(w => w.id === id);
}

export function addWebsite(data: Omit<Website, 'id' | 'created_at'>): Website {
  const newSite: Website = {
    ...data,
    id: 'site_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    created_at: new Date().toISOString(),
  };
  inMemoryDb.websites.unshift(newSite);
  persistDatabase();
  return newSite;
}

export function updateWebsite(id: string, updates: Partial<Website>): Website | null {
  const index = inMemoryDb.websites.findIndex(w => w.id === id);
  if (index === -1) return null;
  inMemoryDb.websites[index] = { ...inMemoryDb.websites[index], ...updates };
  persistDatabase();
  return inMemoryDb.websites[index];
}

export function deleteWebsite(id: string): boolean {
  const initialLen = inMemoryDb.websites.length;
  inMemoryDb.websites = inMemoryDb.websites.filter(w => w.id !== id);
  // Also clean up products & alerts belonging to this website
  const removedProducts = inMemoryDb.products.filter(p => p.website_id === id);
  const removedProductIds = new Set(removedProducts.map(p => p.id));
  inMemoryDb.products = inMemoryDb.products.filter(p => p.website_id !== id);
  inMemoryDb.price_history = inMemoryDb.price_history.filter(ph => !removedProductIds.has(ph.product_id));
  inMemoryDb.alerts = inMemoryDb.alerts.filter(a => a.website_id !== id);
  persistDatabase();
  return inMemoryDb.websites.length < initialLen;
}

// Products
export function getProducts(): Product[] {
  return inMemoryDb.products;
}

export function getProductsByWebsite(websiteId: string): Product[] {
  return inMemoryDb.products.filter(p => p.website_id === websiteId);
}

export function upsertProduct(productData: Omit<Product, 'id' | 'created_at' | 'last_seen_at'>): {
  product: Product;
  isNew: boolean;
  isPriceDrop: boolean;
  isStableDiscount: boolean;
  previousPrice?: number;
  regularPrice: number;
  newDiscountPercentage: number;
} {
  const existingIndex = inMemoryDb.products.findIndex(
    p => p.website_id === productData.website_id && p.product_url === productData.product_url
  );

  const now = new Date().toISOString();

  if (existingIndex >= 0) {
    const existing = inMemoryDb.products[existingIndex];
    const previousPrice = existing.current_price;

    // The true benchmark regular price is the highest verified non-discounted original price
    // Never overwrite regular price with an already-discounted price!
    const regularPrice = Math.max(
      existing.regular_price || existing.original_price || 0,
      productData.regular_price || productData.original_price || 0
    );

    const priceChanged = productData.current_price !== previousPrice;
    const isPriceDrop = productData.current_price < previousPrice;

    // Calculate discount strictly based on the regular (original) price, not already discounted price
    const newDiscountPercentage = regularPrice > productData.current_price && regularPrice > 0
      ? Math.round(((regularPrice - productData.current_price) / regularPrice) * 100)
      : 0;

    // If product was previously discounted and price hasn't dropped further (stable discounted price)
    const isStableDiscount = !priceChanged && (existing.discount_percentage > 0 || newDiscountPercentage > 0);

    const updated: Product = {
      ...existing,
      ...productData,
      regular_price: regularPrice,
      original_price: regularPrice,
      current_price: productData.current_price,
      previous_price: previousPrice,
      discount_percentage: newDiscountPercentage,
      last_seen_at: now,
    };
    inMemoryDb.products[existingIndex] = updated;

    if (priceChanged) {
      addPriceHistory({
        product_id: updated.id,
        regular_price: regularPrice,
        original_price: regularPrice,
        current_price: updated.current_price,
        previous_price: previousPrice,
        discount_percentage: newDiscountPercentage,
        price_change: updated.current_price - previousPrice,
        is_new_drop: isPriceDrop,
      });
    }

    persistDatabase();
    return {
      product: updated,
      isNew: false,
      isPriceDrop,
      isStableDiscount,
      previousPrice,
      regularPrice,
      newDiscountPercentage,
    };
  } else {
    // Brand new product discovery
    const regularPrice = Math.max(productData.regular_price || 0, productData.original_price || 0);
    const newDiscountPercentage = regularPrice > productData.current_price && regularPrice > 0
      ? Math.round(((regularPrice - productData.current_price) / regularPrice) * 100)
      : 0;

    const newProduct: Product = {
      ...productData,
      id: 'prod_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
      regular_price: regularPrice,
      original_price: regularPrice,
      current_price: productData.current_price,
      previous_price: undefined,
      discount_percentage: newDiscountPercentage,
      created_at: now,
      last_seen_at: now,
    };
    inMemoryDb.products.unshift(newProduct);

    // Initial price history record
    addPriceHistory({
      product_id: newProduct.id,
      regular_price: regularPrice,
      original_price: regularPrice,
      current_price: newProduct.current_price,
      previous_price: undefined,
      discount_percentage: newDiscountPercentage,
      price_change: 0,
      is_new_drop: newDiscountPercentage > 0,
    });

    persistDatabase();
    return {
      product: newProduct,
      isNew: true,
      isPriceDrop: newDiscountPercentage > 0,
      isStableDiscount: false,
      regularPrice,
      newDiscountPercentage,
    };
  }
}

// Price History
export function addPriceHistory(data: Omit<PriceHistory, 'id' | 'recorded_at'>): PriceHistory {
  const entry: PriceHistory = {
    ...data,
    id: 'ph_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    recorded_at: new Date().toISOString(),
  };
  inMemoryDb.price_history.push(entry);
  persistDatabase();
  return entry;
}

export function getPriceHistoryForProduct(productId: string): PriceHistory[] {
  return inMemoryDb.price_history.filter(ph => ph.product_id === productId);
}

// Alerts
export function getAlerts(): Alert[] {
  return inMemoryDb.alerts;
}

export function createAlert(data: Omit<Alert, 'id' | 'detected_at' | 'status'>): Alert {
  const alert: Alert = {
    ...data,
    id: 'alt_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    status: 'new',
    detected_at: new Date().toISOString(),
  };
  inMemoryDb.alerts.unshift(alert);
  persistDatabase();
  return alert;
}

export function markAlertViewed(id: string): Alert | null {
  const alert = inMemoryDb.alerts.find(a => a.id === id);
  if (!alert) return null;
  alert.status = 'viewed';
  persistDatabase();
  return alert;
}

export function updateAlert(id: string, updates: Partial<Alert>): Alert | null {
  const alert = inMemoryDb.alerts.find(a => a.id === id);
  if (!alert) return null;
  Object.assign(alert, updates);
  persistDatabase();
  return alert;
}

// Settings
export function getSettings(): AppSettings {
  return inMemoryDb.settings;
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  inMemoryDb.settings = { ...inMemoryDb.settings, ...updates };
  persistDatabase();
  return inMemoryDb.settings;
}

// Dashboard statistics
export function getDashboardStats(): DashboardStats {
  const activeSites = inMemoryDb.websites.filter(w => w.status === 'active').length;
  const totalProducts = inMemoryDb.products.length;
  const activeAlerts = inMemoryDb.alerts.filter(a => a.status === 'new').length;

  let latestScan: string | null = null;
  for (const w of inMemoryDb.websites) {
    if (w.last_scanned_at) {
      if (!latestScan || new Date(w.last_scanned_at) > new Date(latestScan)) {
        latestScan = w.last_scanned_at;
      }
    }
  }

  return {
    monitored_websites: activeSites,
    products_discovered: totalProducts,
    active_alerts: activeAlerts,
    last_scan: latestScan,
  };
}
