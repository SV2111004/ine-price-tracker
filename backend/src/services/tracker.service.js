import { db } from '../config/database.js';
import { scrapeProductPage } from '../scraper/productScraper.js';
import { withRetry } from '../scraper/retry.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Concurrency lock for scheduled batch scraping
let isBatchScrapingActive = false;

export const trackerService = {
  /**
   * Scrapes a single product with retry, validation, and honest logging.
   * 
   * @param {Object} product - Tracked product record
   * @param {Object} [options]
   * @param {boolean} [options.headed=false]
   * @returns {Promise<{ success: boolean, price?: number, stock?: string, error?: string }>}
   */
  async scrapeProduct(product, options = {}) {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    let currentAttempt = 1;

    logger.scraper(`Beginning scrape pipeline for: "${product.product_name}" (ID: ${product.external_product_id})`);

    // Record initial "started" log
    await db.addScrapeLog({
      tracked_product_id: product.id,
      started_at: startedAt,
      completed_at: null,
      status: 'started',
      attempt_number: 1,
      metadata: { url: product.product_url }
    });

    const retryResult = await withRetry(
      async (attempt) => {
        currentAttempt = attempt;
        return await scrapeProductPage({
          productId: product.external_product_id,
          productUrl: product.product_url,
          headed: options.headed || false,
          attempt
        });
      },
      {
        maxAttempts: config.maxRetries,
        initialDelayMs: config.retryDelayMs,
        onAttemptError: async (err, attempt, willRetry) => {
          if (willRetry) {
            await db.addScrapeLog({
              tracked_product_id: product.id,
              started_at: new Date(Date.now() - 2000).toISOString(),
              completed_at: new Date().toISOString(),
              status: 'retrying',
              attempt_number: attempt,
              error_message: err.message,
              response_time_ms: 2000
            });
          }
        }
      }
    );

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    if (retryResult.success) {
      const { price, stock } = retryResult.data;

      // 1. Record success in scrape_logs FIRST to obtain log ID
      const logRecord = await db.addScrapeLog({
        tracked_product_id: product.id,
        started_at: startedAt,
        completed_at: completedAt,
        status: 'success',
        attempt_number: retryResult.attempt,
        extracted_price: price,
        extracted_stock: stock,
        price,
        stock,
        http_status: 200,
        error_type: null,
        error_message: null,
        duration_ms: durationMs,
        response_time_ms: durationMs
      });

      // 2. DATA INTEGRITY: Save price snapshot ONLY when validation passed
      await db.addPriceHistory({
        tracked_product_id: product.id,
        price,
        currency: 'INR',
        stock,
        scrape_log_id: logRecord?.id || null,
        scraped_at: completedAt
      });

      // 3. Update product status
      await db.updateTrackedProduct(product.id, {
        last_scraped_at: completedAt,
        last_scrape_status: 'success'
      });

      return {
        success: true,
        price,
        stock,
        attempt: retryResult.attempt,
        durationMs
      };
    } else {
      // Scrape failed after all bounded retries
      const errorMessage = retryResult.error?.message || 'Unknown scrape failure';
      const errorType = retryResult.error?.name || retryResult.error?.code || 'ScrapeError';
      const httpStatus = retryResult.error?.statusCode || retryResult.error?.status || 500;

      // Record final failure in scrape_logs
      // STRICT RULE: DO NOT insert into price_history!
      await db.addScrapeLog({
        tracked_product_id: product.id,
        started_at: startedAt,
        completed_at: completedAt,
        status: 'failed',
        attempt_number: retryResult.attempt,
        extracted_price: null,
        extracted_stock: null,
        price: null,
        stock: null,
        http_status: httpStatus,
        error_type: errorType,
        error_message: errorMessage,
        duration_ms: durationMs,
        response_time_ms: durationMs,
        metadata: { errorCode: retryResult.error?.code }
      });

      // Update product status
      await db.updateTrackedProduct(product.id, {
        last_scraped_at: completedAt,
        last_scrape_status: 'failed'
      });

      logger.scraper(`Scrape pipeline finished with failure for Product #${product.external_product_id}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        attempt: retryResult.attempt,
        durationMs
      };
    }
  },

  /**
   * Executes scheduled batch scraping over all tracking-enabled products.
   * Concurrency-controlled with mutual exclusion and worker pool.
   */
  async runBatchScrape() {
    if (isBatchScrapingActive) {
      const err = new Error('A scraping batch run is already in progress');
      err.statusCode = 409;
      throw err;
    }

    isBatchScrapingActive = true;
    const batchStartTime = Date.now();

    try {
      const allTracked = await db.getTrackedProducts();
      const enabledProducts = allTracked.filter(p => p.tracking_enabled);
      const concurrency = Math.max(1, config.scrapeConcurrency || 2);

      logger.info(`Starting batch scrape for ${enabledProducts.length} enabled products (concurrency: ${concurrency})...`);

      let successful = 0;
      let failed = 0;

      // Controlled concurrency worker pool
      const queue = [...enabledProducts];
      const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, async () => {
        while (queue.length > 0) {
          const product = queue.shift();
          if (!product) break;
          try {
            const res = await this.scrapeProduct(product);
            if (res.success) {
              successful++;
            } else {
              failed++;
            }
          } catch (err) {
            // Failure on one product never aborts the batch
            failed++;
            logger.error(`Unhandled error scraping product #${product.external_product_id}: ${err.message}`);
          }
        }
      });

      await Promise.all(workers);

      const totalDuration = Date.now() - batchStartTime;
      logger.info(`Batch scrape completed: ${successful} passed, ${failed} failed in ${totalDuration}ms`);

      return {
        total: enabledProducts.length,
        successful,
        failed,
        durationMs: totalDuration
      };
    } finally {
      isBatchScrapingActive = false;
    }
  },

  isBatchRunning() {
    return isBatchScrapingActive;
  }
};
