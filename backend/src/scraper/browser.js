import { chromium } from 'playwright';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let sharedBrowser = null;

/**
 * Creates and launches a Playwright browser instance.
 * @param {Object} options
 * @param {boolean} [options.headed] - Launch in visible headed mode
 * @returns {Promise<import('playwright').Browser>}
 */
export async function createBrowser(options = {}) {
  const isHeaded = options.headed !== undefined ? options.headed : !config.headless;
  
  logger.scraper(`Launching Chromium (${isHeaded ? 'HEADED' : 'HEADLESS'} mode)...`);
  
  const browser = await chromium.launch({
    headless: !isHeaded,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800'
    ]
  });

  return browser;
}

/**
 * Creates a browser context with realistic viewport and timeouts.
 * @param {import('playwright').Browser} browser
 * @returns {Promise<import('playwright').BrowserContext>}
 */
export async function createBrowserContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
  });

  context.setDefaultTimeout(config.contentTimeoutMs);
  context.setDefaultNavigationTimeout(config.navigationTimeoutMs);

  return context;
}

/**
 * Safely closes a page, context, or browser.
 */
export async function closeSafe(resource) {
  if (!resource) return;
  try {
    await resource.close();
  } catch (err) {
    logger.warn(`Error closing resource: ${err.message}`);
  }
}
