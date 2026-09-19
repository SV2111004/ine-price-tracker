import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let cachedCatalog = null;
let lastCatalogFetchTime = 0;
const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches and caches products from the INE Mock Store catalog API.
 * Uses pagination to load available products.
 */
export async function getCachedCatalog() {
  const now = Date.now();
  if (cachedCatalog && (now - lastCatalogFetchTime < CATALOG_CACHE_TTL_MS)) {
    return cachedCatalog;
  }

  logger.info('Refreshing INE Mock Store catalog cache...');
  const allProducts = new Map();

  // Fetch first 5 pages with pageSize=60 (max supported) to build a rich search index
  try {
    for (let page = 1; page <= 5; page++) {
      const url = `${config.mockStoreBaseUrl}/api/catalog?page=${page}&pageSize=60`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn(`Failed to fetch catalog page ${page}: HTTP ${res.status}`);
        break;
      }
      const data = await res.json();
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          allProducts.set(item.id, item);
        }
      }
      if (!data.pages || page >= data.pages) break;
    }

    cachedCatalog = Array.from(allProducts.values());
    lastCatalogFetchTime = now;
    logger.info(`Catalog cache updated with ${cachedCatalog.length} unique items.`);
    return cachedCatalog;
  } catch (err) {
    logger.error(`Error loading catalog: ${err.message}`);
    if (cachedCatalog) return cachedCatalog;
    return [];
  }
}

/**
 * Searches the INE catalog by name, brand, category, or SKU.
 * 
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchCatalog(query) {
  if (!query || !query.trim()) {
    const catalog = await getCachedCatalog();
    return catalog.slice(0, 20);
  }

  const q = query.toLowerCase().trim();
  const catalog = await getCachedCatalog();

  // Score and filter matching products
  const matches = catalog.filter(p => {
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const brandMatch = (p.brand || '').toLowerCase().includes(q);
    const categoryMatch = (p.category || '').toLowerCase().includes(q);
    const skuMatch = (p.sku || '').toLowerCase().includes(q);
    const idMatch = String(p.id) === q;
    return nameMatch || brandMatch || categoryMatch || skuMatch || idMatch;
  });

  return matches.slice(0, 30);
}

/**
 * Fetches verified product metadata directly from INE product API.
 * 
 * @param {number|string} productId
 * @returns {Promise<Object|null>}
 */
export async function fetchProductMetadata(productId) {
  const url = `${config.mockStoreBaseUrl}/api/product/${productId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`INE Product API returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    logger.error(`Error fetching product #${productId}: ${err.message}`);
    throw err;
  }
}
