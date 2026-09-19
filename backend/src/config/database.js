import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Supabase credentials are configured
const hasSupabase = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

let supabaseClient = null;
if (hasSupabase) {
  logger.info('Initializing Supabase PostgreSQL client with service role...');
  supabaseClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });
} else {
  logger.info('Supabase credentials not configured in environment. Using local atomic file database for local development.');
}

// Local File Database for development fallback
const localDbDir = path.resolve(__dirname, '../../data');
const localDbFile = path.resolve(localDbDir, 'dev_store.json');

function readLocalDb() {
  try {
    if (!fs.existsSync(localDbDir)) {
      fs.mkdirSync(localDbDir, { recursive: true });
    }
    if (!fs.existsSync(localDbFile)) {
      const initial = {
        tracked_products: [],
        price_history: [],
        scrape_logs: []
      };
      fs.writeFileSync(localDbFile, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(localDbFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error(`Error reading local DB: ${err.message}`);
    return { tracked_products: [], price_history: [], scrape_logs: [] };
  }
}

function writeLocalDb(data) {
  try {
    if (!fs.existsSync(localDbDir)) {
      fs.mkdirSync(localDbDir, { recursive: true });
    }
    const tempFile = `${localDbFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, localDbFile);
  } catch (err) {
    logger.error(`Error writing local DB: ${err.message}`);
  }
}

export const db = {
  isSupabase() {
    return hasSupabase;
  },

  // --------------------------------------------------------------------------
  // TRACKED PRODUCTS
  // --------------------------------------------------------------------------

  async getTrackedProducts() {
    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('tracked_products')
        .select(`
          *,
          price_history (price, stock, scraped_at),
          scrape_logs (status, completed_at, error_message, attempt_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Supabase query error: ${error.message}`);

      // Map to include latest price and latest log
      return (data || []).map(p => {
        const sortedHistory = (p.price_history || []).sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
        const sortedLogs = (p.scrape_logs || []).sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
        return {
          ...p,
          latest_price: sortedHistory[0]?.price ?? null,
          latest_stock: sortedHistory[0]?.stock ?? null,
          latest_scraped_at: sortedHistory[0]?.scraped_at ?? null,
          last_scrape_status: sortedLogs[0]?.status ?? 'never_scraped',
          last_scrape_completed_at: sortedLogs[0]?.completed_at ?? null,
          last_scrape_error: sortedLogs[0]?.error_message ?? null
        };
      });
    }

    // Local DB fallback
    const local = readLocalDb();
    return local.tracked_products
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(p => {
        const history = local.price_history
          .filter(h => h.tracked_product_id === p.id)
          .sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at));
        const logs = local.scrape_logs
          .filter(l => l.tracked_product_id === p.id)
          .sort((a, b) => new Date(b.completed_at || b.started_at) - new Date(a.completed_at || a.started_at));

        return {
          ...p,
          latest_price: history[0]?.price ?? null,
          latest_stock: history[0]?.stock ?? null,
          latest_scraped_at: history[0]?.scraped_at ?? null,
          last_scrape_status: logs[0]?.status ?? 'never_scraped',
          last_scrape_completed_at: logs[0]?.completed_at ?? null,
          last_scrape_error: logs[0]?.error_message ?? null
        };
      });
  },

  async getTrackedProductById(id) {
    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('tracked_products')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    }

    const local = readLocalDb();
    return local.tracked_products.find(p => p.id === id) || null;
  },

  async getTrackedProductByExternalId(externalId) {
    const extStr = String(externalId);
    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('tracked_products')
        .select('*')
        .eq('external_product_id', extStr)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    }

    const local = readLocalDb();
    return local.tracked_products.find(p => String(p.external_product_id) === extStr) || null;
  },

  async addTrackedProduct(product) {
    const extId = String(product.external_product_id);
    const existing = await this.getTrackedProductByExternalId(extId);
    if (existing) {
      const err = new Error(`Product with ID "${extId}" is already being tracked`);
      err.statusCode = 409;
      throw err;
    }

    const now = new Date().toISOString();
    const newRecord = {
      id: crypto.randomUUID(),
      external_product_id: extId,
      product_name: product.product_name,
      product_url: product.product_url,
      image_url: product.image_url || null,
      category: product.category || null,
      sku: product.sku || null,
      tracking_enabled: product.tracking_enabled !== false,
      created_at: now,
      updated_at: now
    };

    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('tracked_products')
        .insert(newRecord)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    local.tracked_products.push(newRecord);
    writeLocalDb(local);
    return newRecord;
  },

  async deleteTrackedProduct(id) {
    if (hasSupabase) {
      const { error } = await supabaseClient
        .from('tracked_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    }

    const local = readLocalDb();
    const index = local.tracked_products.findIndex(p => p.id === id);
    if (index === -1) return false;

    local.tracked_products.splice(index, 1);
    // Cascade delete history and logs
    local.price_history = local.price_history.filter(h => h.tracked_product_id !== id);
    local.scrape_logs = local.scrape_logs.filter(l => l.tracked_product_id !== id);
    writeLocalDb(local);
    return true;
  },

  async updateTrackedProduct(id, updates) {
    const now = new Date().toISOString();
    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('tracked_products')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    const p = local.tracked_products.find(item => item.id === id);
    if (!p) return null;

    Object.assign(p, updates, { updated_at: now });
    writeLocalDb(local);
    return p;
  },

  // --------------------------------------------------------------------------
  // PRICE HISTORY
  // --------------------------------------------------------------------------

  async getPriceHistory(trackedProductId, limit = 100) {
    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('price_history')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('scraped_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }

    const local = readLocalDb();
    return local.price_history
      .filter(h => h.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(b.scraped_at) - new Date(a.scraped_at))
      .slice(0, limit);
  },

  async addPriceHistory({ tracked_product_id, price, currency = 'INR', stock, scrape_log_id = null, scraped_at }) {
    // Strictly validate before saving
    if (price === null || price === undefined || isNaN(price) || price < 0) {
      throw new Error(`Invalid price for history: ${price}`);
    }
    if (!stock) {
      throw new Error('Stock must not be empty for history');
    }

    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      tracked_product_id,
      price: Number(price),
      currency: currency || 'INR',
      stock: String(stock),
      scrape_log_id: scrape_log_id || null,
      scraped_at: scraped_at || now,
      created_at: now
    };

    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('price_history')
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const local = readLocalDb();
    local.price_history.push(record);
    writeLocalDb(local);
    return record;
  },

  // --------------------------------------------------------------------------
  // SCRAPE LOGS
  // --------------------------------------------------------------------------

  async getScrapeLogs(trackedProductId, limit = 100) {
    if (hasSupabase) {
      const { data, error } = await supabaseClient
        .from('scrape_logs')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }

    const local = readLocalDb();
    return local.scrape_logs
      .filter(l => l.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
      .slice(0, limit);
  },

  async addScrapeLog(logData) {
    const durationMs = logData.duration_ms ?? logData.response_time_ms ?? null;
    const extractedPrice = logData.extracted_price ?? (logData.price !== undefined && logData.price !== null ? Number(logData.price) : null);
    const extractedStock = logData.extracted_stock ?? (logData.stock ? String(logData.stock) : null);

    const record = {
      id: crypto.randomUUID(),
      tracked_product_id: logData.tracked_product_id,
      started_at: logData.started_at || new Date().toISOString(),
      completed_at: logData.completed_at || null,
      status: logData.status, // 'started', 'retrying', 'success', 'failed'
      attempt_number: logData.attempt_number || 1,
      http_status: logData.http_status ?? null,
      error_type: logData.error_type ?? null,
      error_message: logData.error_message ?? null,
      duration_ms: durationMs,
      extracted_price: extractedPrice,
      extracted_stock: extractedStock,
      // Backward compatibility aliases for frontend & legacy queries
      price: extractedPrice,
      stock: extractedStock,
      response_time_ms: durationMs,
      metadata: logData.metadata || {}
    };

    if (hasSupabase) {
      // Create Supabase insert record matching schema.sql
      const dbInsert = {
        id: record.id,
        tracked_product_id: record.tracked_product_id,
        started_at: record.started_at,
        completed_at: record.completed_at,
        status: record.status,
        attempt_number: record.attempt_number,
        http_status: record.http_status,
        error_type: record.error_type,
        error_message: record.error_message,
        duration_ms: record.duration_ms,
        extracted_price: record.extracted_price,
        extracted_stock: record.extracted_stock,
        metadata: record.metadata
      };

      const { data, error } = await supabaseClient
        .from('scrape_logs')
        .insert(dbInsert)
        .select()
        .single();
      if (error) {
        logger.error(`Failed to insert scrape log into Supabase: ${error.message}`);
        return record;
      }
      return { ...data, price: data.extracted_price, stock: data.extracted_stock, response_time_ms: data.duration_ms };
    }

    const local = readLocalDb();
    local.scrape_logs.push(record);
    writeLocalDb(local);
    return record;
  }
};
