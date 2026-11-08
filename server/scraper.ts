import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  name: string;
  product_url: string;
  image_url: string;
  currency: string;
  original_price: number;
  current_price: number;
  discount_percentage: number;
  is_verified_discount: boolean;
  availability: 'in_stock' | 'out_of_stock';
}

export interface ScrapeResult {
  storeName: string;
  favicon?: string;
  products: ScrapedProduct[];
  diagnostics: {
    strategyUsed: string;
    totalFound: number;
    withDiscounts: number;
    durationMs: number;
    message?: string;
  };
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function normalizeUrl(baseUrl: string, relativeOrAbsolute: string): string {
  try {
    const parsed = new URL(relativeOrAbsolute, baseUrl);
    // Remove tracking queries
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    paramsToRemove.forEach(p => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    return relativeOrAbsolute;
  }
}

export function parsePriceNumber(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === 'number') return raw;
  const cleaned = raw.toString().replace(/[^0-9.,]/g, '').trim();
  if (!cleaned) return 0;

  // Handle formats like 1,250.00 or 1.250,00 or 5000
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
      // standard 1,500.00
      return parseFloat(cleaned.replace(/,/g, ''));
    } else {
      // european 1.500,00
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
  } else if (cleaned.includes(',')) {
    // If only comma, check if it looks like a decimal separator e.g. "25,50"
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(cleaned.replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }
  return parseFloat(cleaned) || 0;
}

export function detectCurrencySymbol(text: string, defaultCurrency: string = 'PKR'): string {
  const upper = text.toUpperCase();
  if (upper.includes('RS') || upper.includes('PKR') || upper.includes('₨')) return 'PKR';
  if (upper.includes('$') || upper.includes('USD')) return 'USD';
  if (upper.includes('€') || upper.includes('EUR')) return 'EUR';
  if (upper.includes('£') || upper.includes('GBP')) return 'GBP';
  if (upper.includes('₹') || upper.includes('INR')) return 'INR';
  if (upper.includes('AED') || upper.includes('DIRHAM')) return 'AED';
  if (upper.includes('CAD')) return 'CAD';
  if (upper.includes('AUD')) return 'AUD';
  return defaultCurrency;
}

/**
 * Validate website reachability and check if product data can be extracted
 */
export async function validateWebsite(rawUrl: string): Promise<{
  isValid: boolean;
  normalizedUrl: string;
  storeName: string;
  favicon?: string;
  message?: string;
  sampleProductsCount?: number;
}> {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const parsed = new URL(targetUrl);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, normalizedUrl: targetUrl, storeName: '', message: 'Invalid domain name.' };
    }
  } catch {
    return { isValid: false, normalizedUrl: targetUrl, storeName: '', message: 'Invalid URL format.' };
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok && res.status !== 403) {
      return {
        isValid: false,
        normalizedUrl: targetUrl,
        storeName: '',
        message: `HTTP Error: Received status ${res.status} from website.`,
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract title & brand name
    let storeName = $('meta[property="og:site_name"]').attr('content') ||
                    $('meta[name="application-name"]').attr('content') ||
                    $('title').text().split(/[-|–•]/)[0].trim();

    if (!storeName) {
      const hostname = new URL(targetUrl).hostname.replace(/^www\./, '');
      storeName = hostname.split('.')[0];
      storeName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
    }

    // Extract favicon
    let favicon = $('link[rel="icon"]').attr('href') ||
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="apple-touch-icon"]').attr('href');
    if (favicon) {
      favicon = normalizeUrl(targetUrl, favicon);
    } else {
      favicon = `https://www.google.com/s2/favicons?domain=${new URL(targetUrl).hostname}&sz=64`;
    }

    return {
      isValid: true,
      normalizedUrl: targetUrl,
      storeName,
      favicon,
      message: 'Website reachable and verified.',
    };
  } catch (err: any) {
    return {
      isValid: false,
      normalizedUrl: targetUrl,
      storeName: '',
      message: err.name === 'TimeoutError'
        ? 'Connection timed out. The website took too long to respond.'
        : `Could not reach website: ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Main Scrape Engine
 */
export async function scrapeWebsite(targetUrl: string, storeNameOverride?: string): Promise<ScrapeResult> {
  const startTime = Date.now();
  let normalizedBase = targetUrl.trim();
  if (!normalizedBase.startsWith('http://') && !normalizedBase.startsWith('https://')) {
    normalizedBase = 'https://' + normalizedBase;
  }

  const origin = new URL(normalizedBase).origin;
  const products: ScrapedProduct[] = [];
  let strategy = 'Generic HTML Scraper';
  let storeName = storeNameOverride || '';
  let favicon: string | undefined;

  // 1. Try Shopify endpoints first (/products.json)
  try {
    const shopifyUrls = [
      `${origin}/products.json?limit=50`,
      `${origin}/collections/all/products.json?limit=50`,
    ];

    for (const shopifyUrl of shopifyUrls) {
      try {
        const response = await fetch(shopifyUrl, {
          headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('json')) {
            const data = await response.json();
            if (data && Array.isArray(data.products) && data.products.length > 0) {
              strategy = 'Shopify Catalog API (High Precision)';
              for (const item of data.products) {
                const variant = item.variants && item.variants[0];
                if (!variant) continue;

                const currentPrice = parsePriceNumber(variant.price);
                const originalPrice = parsePriceNumber(variant.compare_at_price);
                const hasCompare = originalPrice > currentPrice && currentPrice > 0;

                const discountPercentage = hasCompare
                  ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                  : 0;

                let img = item.images && item.images[0] ? item.images[0].src : '';
                if (!img && item.image) img = item.image.src;

                products.push({
                  name: item.title || 'Untitled Product',
                  product_url: `${origin}/products/${item.handle}`,
                  image_url: img || '',
                  currency: 'PKR', // default or detected later
                  original_price: hasCompare ? originalPrice : currentPrice,
                  current_price: currentPrice,
                  discount_percentage: discountPercentage,
                  is_verified_discount: hasCompare,
                  availability: variant.available !== false ? 'in_stock' : 'out_of_stock',
                });
              }
              break;
            }
          }
        }
      } catch {
        // Continue to other strategies
      }
    }
  } catch {
    // Continue to HTML parsing
  }

  // 2. Fetch HTML for JSON-LD, Schema.org, OpenGraph and DOM
  if (products.length === 0) {
    try {
      const res = await fetch(normalizedBase, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        if (!storeName) {
          storeName = $('meta[property="og:site_name"]').attr('content') ||
                      $('meta[name="application-name"]').attr('content') ||
                      $('title').text().split(/[-|–•]/)[0].trim();
        }

        favicon = $('link[rel="icon"]').attr('href') ||
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="apple-touch-icon"]').attr('href');
        if (favicon) {
          favicon = normalizeUrl(normalizedBase, favicon);
        } else {
          favicon = `https://www.google.com/s2/favicons?domain=${new URL(normalizedBase).hostname}&sz=64`;
        }

        // 2a. JSON-LD / Schema.org extraction
        $('script[type="application/ld+json"]').each((_, elem) => {
          try {
            const rawContent = $(elem).text().trim();
            if (!rawContent) return;
            const parsed = JSON.parse(rawContent);

            const items: any[] = [];
            if (Array.isArray(parsed)) {
              items.push(...parsed);
            } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
              items.push(...parsed['@graph']);
            } else {
              items.push(parsed);
            }

            for (const item of items) {
              if (item['@type'] === 'Product') {
                const name = item.name;
                const url = item.url ? normalizeUrl(normalizedBase, item.url) : normalizedBase;
                let image = '';
                if (typeof item.image === 'string') image = item.image;
                else if (Array.isArray(item.image) && item.image[0]) image = item.image[0];
                else if (item.image && item.image.url) image = item.image.url;

                let currentPrice = 0;
                let originalPrice = 0;
                let currency = 'PKR';
                let availability: 'in_stock' | 'out_of_stock' = 'in_stock';

                if (item.offers) {
                  const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                  currentPrice = parsePriceNumber(offer.price || offer.lowPrice);
                  currency = offer.priceCurrency || 'PKR';
                  if (offer.highPrice && parsePriceNumber(offer.highPrice) > currentPrice) {
                    originalPrice = parsePriceNumber(offer.highPrice);
                  }
                  if (offer.availability && typeof offer.availability === 'string') {
                    if (offer.availability.includes('OutOfStock')) {
                      availability = 'out_of_stock';
                    }
                  }
                }

                if (name && currentPrice > 0) {
                  const hasVerifiedDiscount = originalPrice > currentPrice;
                  const discountPct = hasVerifiedDiscount
                    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                    : 0;

                  products.push({
                    name,
                    product_url: url,
                    image_url: image ? normalizeUrl(normalizedBase, image) : '',
                    currency,
                    original_price: hasVerifiedDiscount ? originalPrice : currentPrice,
                    current_price: currentPrice,
                    discount_percentage: discountPct,
                    is_verified_discount: hasVerifiedDiscount,
                    availability,
                  });
                  strategy = 'Schema.org JSON-LD Extraction';
                }
              } else if (item['@type'] === 'ItemList' && Array.isArray(item.itemListElement)) {
                strategy = 'Schema.org ItemList Extraction';
                for (const listEl of item.itemListElement) {
                  const prod = listEl.item || listEl;
                  if (prod && (prod.name || prod['@type'] === 'Product')) {
                    const name = prod.name;
                    const url = prod.url ? normalizeUrl(normalizedBase, prod.url) : normalizedBase;
                    const currentPrice = parsePriceNumber(prod.offers?.price);
                    if (name && currentPrice > 0) {
                      products.push({
                        name,
                        product_url: url,
                        image_url: prod.image ? normalizeUrl(normalizedBase, prod.image) : '',
                        currency: prod.offers?.priceCurrency || 'PKR',
                        original_price: currentPrice,
                        current_price: currentPrice,
                        discount_percentage: 0,
                        is_verified_discount: false,
                        availability: 'in_stock',
                      });
                    }
                  }
                }
              }
            }
          } catch {
            // Ignore malformed JSON-LD scripts
          }
        });

        // 2b. DOM extraction (Product cards, strikethrough prices, compare tags)
        if (products.length === 0) {
          const cardSelectors = [
            '.product-card',
            '.product-item',
            '.product__item',
            '.grid-product',
            '.product-tile',
            '.item-card',
            'article[class*="product"]',
            'div[class*="product-card"]',
            'li[class*="product"]',
          ];

          for (const selector of cardSelectors) {
            const cards = $(selector);
            if (cards.length > 0) {
              strategy = `DOM Card Extraction (${selector})`;
              cards.each((_, el) => {
                const card = $(el);
                // Title
                const titleEl = card.find('h2, h3, h4, .title, .product-title, .product__title, a[class*="title"]').first();
                const name = titleEl.text().trim() || card.find('a').first().attr('title')?.trim();

                // Link
                let link = card.find('a').first().attr('href') || '';
                if (link) link = normalizeUrl(normalizedBase, link);

                // Image
                let img = card.find('img').first().attr('src') ||
                          card.find('img').first().attr('data-src') ||
                          card.find('img').first().attr('data-srcset')?.split(' ')[0] || '';
                if (img) img = normalizeUrl(normalizedBase, img);

                // Prices
                // Look for strike, del, compare, was-price, regular-price
                const delEl = card.find('del, s, strike, .compare-at-price, .was-price, .old-price, .regular-price, [class*="line-through"]').first();
                const currentEl = card.find('.sale-price, .special-price, .current-price, .price--sale, ins, [class*="current"]').first();

                const originalPriceText = delEl.text().trim();
                let currentPriceText = currentEl.text().trim();
                if (!currentPriceText) {
                  // Fallback to all price text minus the delEl text
                  currentPriceText = card.find('.price, [class*="price"]').not('del, s, strike').first().text().trim();
                }

                const originalPrice = parsePriceNumber(originalPriceText);
                const currentPrice = parsePriceNumber(currentPriceText);
                const detectedCurr = detectCurrencySymbol(originalPriceText + ' ' + currentPriceText);

                if (name && currentPrice > 0) {
                  const hasDiscount = originalPrice > currentPrice;
                  const discountPct = hasDiscount
                    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                    : 0;

                  products.push({
                    name,
                    product_url: link || normalizedBase,
                    image_url: img,
                    currency: detectedCurr,
                    original_price: hasDiscount ? originalPrice : currentPrice,
                    current_price: currentPrice,
                    discount_percentage: discountPct,
                    is_verified_discount: hasDiscount,
                    availability: 'in_stock',
                  });
                }
              });
              if (products.length > 0) break;
            }
          }
        }

        // 2c. Single Product Page fallback (OpenGraph)
        if (products.length === 0) {
          const ogTitle = $('meta[property="og:title"]').attr('content');
          const ogImage = $('meta[property="og:image"]').attr('content');
          const ogUrl = $('meta[property="og:url"]').attr('content') || normalizedBase;
          const ogPrice = $('meta[property="product:price:amount"]').attr('content');
          const ogOriginal = $('meta[property="product:original_price:amount"]').attr('content');

          if (ogTitle && (ogPrice || $('[class*="price"]').length > 0)) {
            strategy = 'OpenGraph Single Product Metadata';
            const currentPrice = parsePriceNumber(ogPrice || $('[class*="price"]').first().text());
            const originalPrice = parsePriceNumber(ogOriginal || $('del, strike').first().text());
            const hasDiscount = originalPrice > currentPrice;
            const discountPct = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

            if (currentPrice > 0) {
              products.push({
                name: ogTitle,
                product_url: normalizeUrl(normalizedBase, ogUrl),
                image_url: ogImage ? normalizeUrl(normalizedBase, ogImage) : '',
                currency: 'PKR',
                original_price: hasDiscount ? originalPrice : currentPrice,
                current_price: currentPrice,
                discount_percentage: discountPct,
                is_verified_discount: hasDiscount,
                availability: 'in_stock',
              });
            }
          }
        }
      }
    } catch (e: any) {
      console.warn(`[Scraper] HTML Fetch issue for ${normalizedBase}:`, e.message);
    }
  }

  // Fallback store name if empty
  if (!storeName) {
    const host = new URL(normalizedBase).hostname.replace(/^www\./, '');
    storeName = host.split('.')[0].toUpperCase();
  }

  // Deduplicate products by product_url or normalized name
  const seenUrls = new Set<string>();
  const uniqueProducts: ScrapedProduct[] = [];
  for (const p of products) {
    const key = p.product_url || p.name;
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      uniqueProducts.push(p);
    }
  }

  const durationMs = Date.now() - startTime;
  const withDiscounts = uniqueProducts.filter(p => p.discount_percentage > 0).length;

  return {
    storeName,
    favicon: favicon || `https://www.google.com/s2/favicons?domain=${new URL(normalizedBase).hostname}&sz=64`,
    products: uniqueProducts,
    diagnostics: {
      strategyUsed: strategy,
      totalFound: uniqueProducts.length,
      withDiscounts,
      durationMs,
      message: uniqueProducts.length > 0
        ? `Successfully extracted ${uniqueProducts.length} products (${withDiscounts} with detected discounts) in ${durationMs}ms using ${strategy}.`
        : `Scanned ${normalizedBase} in ${durationMs}ms but no product elements were identifiable on the target page. Please ensure the URL links to a store catalog, collection, or product page.`,
    },
  };
}
