import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root if it exists
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Security
  cronSecret: process.env.CRON_SECRET || 'dev_cron_secret_ine_2026',

  // Scraper Engine Config
  mockStoreBaseUrl: process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com',
  scrapeTimeoutMs: parseInt(process.env.SCRAPE_TIMEOUT_MS || '30000', 10),
  navigationTimeoutMs: parseInt(process.env.NAVIGATION_TIMEOUT_MS || '15000', 10),
  contentTimeoutMs: parseInt(process.env.CONTENT_TIMEOUT_MS || '10000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1500', 10),
  scrapeConcurrency: parseInt(process.env.SCRAPE_CONCURRENCY || '2', 10),
  headless: process.env.HEADLESS !== 'false',
};
