import { createBrowser, createBrowserContext, closeSafe } from './browser.js';
import { validatePrice, validateStock } from './validator.js';
import { 
  ChallengeFailedError, 
  NavigationTimeoutError, 
  StructureChangeError, 
  PriceExtractionError, 
  StockExtractionError 
} from './errors.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Scrapes a single product from the INE Mock Store using Playwright.
 * 
 * Performs:
 * 1. Product page navigation
 * 2. Banner/cookie consent handling
 * 3. Price widget locator & hover simulation
 * 4. "Reveal price" interaction
 * 5. Network and DOM observation
 * 6. Honest extraction or error detection
 * 
 * @param {Object} params
 * @param {number|string} params.productId - INE Product ID (e.g. 614)
 * @param {string} [params.productUrl] - Full product URL
 * @param {boolean} [params.headed] - Run in visible browser mode
 * @param {number} [params.attempt=1] - Current attempt index
 * @returns {Promise<{ price: number, stock: string, rawPrice: string, rawStock: string, durationMs: number }>}
 */
export async function scrapeProductPage({ productId, productUrl, headed, attempt = 1 }) {
  const targetUrl = productUrl || `${config.mockStoreBaseUrl}/product/${productId}`;
  const startTime = Date.now();

  logger.scraper(`Starting scrape for Product #${productId}`, { url: targetUrl, attempt, headed: Boolean(headed) });

  let browser = null;
  let context = null;
  let page = null;

  try {
    browser = await createBrowser({ headed });
    context = await createBrowserContext(browser);
    page = await context.newPage();

    let sessionStatus = null;
    let challengeStatus = null;
    let challengeErrorMsg = null;

    // Monitor network traffic for /api/challenge, /api/session, and /api/prices
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/challenge')) {
        challengeStatus = response.status();
        logger.scraper(`Network: /api/challenge -> HTTP ${challengeStatus}`);
      }
      if (url.includes('/api/session')) {
        sessionStatus = response.status();
        logger.scraper(`Network: /api/session -> HTTP ${sessionStatus}`);
        if (sessionStatus === 401) {
          challengeErrorMsg = 'HTTP 401 Unauthorized from /api/session';
        }
      }
    });

    // 1. Navigate to product page
    logger.scraper(`Navigating to ${targetUrl}...`);
    try {
      await page.goto(targetUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: config.navigationTimeoutMs 
      });
    } catch (err) {
      throw new NavigationTimeoutError(`Navigation timeout to ${targetUrl}: ${err.message}`);
    }

    // 2. Wait for main product container to mount
    try {
      await page.waitForSelector('h1, .product-title, article', { timeout: config.contentTimeoutMs });
    } catch (err) {
      throw new StructureChangeError(`Product details failed to render on page: ${err.message}`);
    }

    // 3. Dismiss any cookie or notification dialogs if present
    const cookieButtons = page.locator('button:has-text("Accept"), button:has-text("I agree"), button:has-text("Dismiss"), button:has-text("Close")');
    if (await cookieButtons.count() > 0) {
      try {
        await cookieButtons.first().click({ timeout: 1000 });
        logger.scraper('Dismissed cookie/dialog banner');
      } catch (_) {
        // Non-fatal if banner already closed
      }
    }

    // 4. Locate Price Widget & Container
    const priceBlock = page.locator('.price-block');
    const hasPriceBlock = await priceBlock.count() > 0;

    if (hasPriceBlock) {
      logger.scraper('Found .price-block container. Executing natural hover & dwell telemetry...');
      const box = await priceBlock.first().boundingBox();

      if (box) {
        // Move mouse into .price-block container
        await page.mouse.move(box.x + 20, box.y + 20);
        await page.waitForTimeout(100);

        // Perform at least 12 sequential moves at 60ms intervals (satisfies minMoves: 8, kr: 40ms)
        for (let i = 1; i <= 12; i++) {
          const targetX = box.x + 20 + (i * (box.width - 40) / 12);
          const targetY = box.y + 20 + (i % 2 === 0 ? 10 : 25);
          await page.mouse.move(targetX, targetY);
          await page.waitForTimeout(60);
        }

        // Dwell for 750ms to satisfy minDwellMs: 600
        await page.waitForTimeout(750);
      }

      // Locate Reveal button and wait for it to become enabled
      const revealBtn = page.locator('button:has-text("Reveal price"), button.btn-primary');
      if (await revealBtn.count() > 0) {
        try {
          await revealBtn.first().waitFor({ state: 'visible', timeout: 3000 });
          const isEnabled = await revealBtn.first().isEnabled();
          logger.scraper(`Reveal button enabled state after hover: ${isEnabled}`);

          if (isEnabled) {
            await revealBtn.first().click();
            logger.scraper('Clicked "Reveal price" button. Executing site browser JS flow...');
          }
        } catch (err) {
          logger.scraper(`Note on Reveal button click: ${err.message}`);
        }
      }

      // Wait for either price result, error state, or network session completion
      try {
        await page.waitForSelector('.price-block.price-error, .price-value, .pv-k2, [class*="priceWrap"] .price-status', {
          timeout: 5000
        });
      } catch (_) {
        // Fallback brief wait if selector structure is varied
        await page.waitForTimeout(2000);
      }
    } else {
      logger.scraper('No .price-block found; checking if price is already directly rendered...');
    }

    // 5. Inspect DOM for challenge failure or error states
    const pageText = await page.textContent('body');

    if (
      pageText.includes("Couldn't load the price") || 
      pageText.includes('challenge_failed') || 
      sessionStatus === 401
    ) {
      const reason = challengeErrorMsg 
        ? `${challengeErrorMsg} (challenge_failed in UI)` 
        : 'Store challenge verification failed (challenge_failed in UI)';
      logger.scraper(`Observed challenge failure on page: ${reason}`);
      throw new ChallengeFailedError(reason, {
        productId,
        challengeStatus,
        sessionStatus
      });
    }

    // 6. Check for Price and Stock in DOM
    // The INE mock store layout uses classes or text matching currency
    let extractedPrice = null;
    let extractedStock = null;

    // Look for price elements with currency symbol ₹ or Rs
    const priceCandidates = page.locator('span, div, p').filter({ hasText: /₹|Rs\./ });
    const count = await priceCandidates.count();

    for (let i = 0; i < count; i++) {
      const text = (await priceCandidates.nth(i).textContent() || '').trim();
      // Avoid matching large paragraph containers
      if (text.length < 30 && /[₹\d]/.test(text)) {
        try {
          const validated = validatePrice(text);
          extractedPrice = { raw: text, value: validated };
          break;
        } catch (_) {}
      }
    }

    // Look for stock status elements (including dynamic layout stock classes)
    const stockCandidates = page.locator('span, div, p, [class*="stock"], [class*="st-"]').filter({ 
      hasText: /(?:in\s*stock|out\s*of\s*stock|only\s+\d+\s+left|selling\s+fast|hurry|left\b|units?\s+left)/i 
    });
    const stockCount = await stockCandidates.count();

    for (let i = 0; i < stockCount; i++) {
      const text = (await stockCandidates.nth(i).textContent() || '').trim();
      if (text.length < 50) {
        try {
          const validated = validateStock(text);
          extractedStock = { raw: text, value: validated.text };
          break;
        } catch (_) {}
      }
    }

    // 7. Validate extractions
    if (!extractedPrice) {
      if (pageText.includes('Price hidden') || pageText.includes('Hover over the price')) {
        throw new ChallengeFailedError('Price remained hidden behind unfulfilled interaction / challenge barrier', {
          productId,
          challengeStatus,
          sessionStatus
        });
      }
      throw new PriceExtractionError(`Price could not be extracted from ${targetUrl}`);
    }

    if (!extractedStock) {
      throw new StockExtractionError(`Stock state could not be extracted from ${targetUrl}`);
    }

    const durationMs = Date.now() - startTime;
    logger.scraper(`Scrape SUCCESS for Product #${productId}`, {
      price: extractedPrice.value,
      stock: extractedStock.value,
      durationMs
    });

    return {
      price: extractedPrice.value,
      stock: extractedStock.value,
      rawPrice: extractedPrice.raw,
      rawStock: extractedStock.raw,
      durationMs
    };

  } finally {
    await closeSafe(page);
    await closeSafe(context);
    await closeSafe(browser);
  }
}
