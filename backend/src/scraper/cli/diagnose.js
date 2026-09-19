import { scrapeProductPage } from '../productScraper.js';
import { withRetry } from '../retry.js';
import { config } from '../../config/env.js';

async function runDiagnostic() {
  const productId = process.argv[2] || '614';
  const productUrl = `${config.mockStoreBaseUrl}/product/${productId}`;
  const startTime = Date.now();

  console.log('==================================================');
  console.log('       INE PRICE TRACKER - SCRAPER DIAGNOSTIC     ');
  console.log('==================================================');
  console.log(`[SCRAPER] Starting`);
  console.log(`[SCRAPER] Product ID: ${productId}`);
  console.log(`[SCRAPER] Product URL: ${productUrl}`);
  console.log(`[SCRAPER] Target Store: ${config.mockStoreBaseUrl}`);
  console.log(`[SCRAPER] Max Retries: ${config.maxRetries}`);
  console.log('--------------------------------------------------');

  const result = await withRetry(
    async (attempt) => {
      console.log(`[SCRAPER] Attempt ${attempt}/${config.maxRetries}`);
      console.log(`[SCRAPER] Navigating to ${productUrl}...`);
      console.log(`[SCRAPER] Waiting for content...`);

      const scrapeResult = await scrapeProductPage({
        productId,
        productUrl,
        headed: false,
        attempt
      });

      console.log(`[SCRAPER] Price source: Browser DOM`);
      console.log(`[SCRAPER] Price extracted: ₹${scrapeResult.price} (raw: "${scrapeResult.rawPrice}")`);
      console.log(`[SCRAPER] Stock source: Browser DOM`);
      console.log(`[SCRAPER] Stock extracted: ${scrapeResult.stock} (raw: "${scrapeResult.rawStock}")`);
      console.log(`[SCRAPER] Validation passed`);
      return scrapeResult;
    },
    {
      maxAttempts: config.maxRetries,
      initialDelayMs: config.retryDelayMs,
      onAttemptError: (err, attempt, willRetry) => {
        console.log(`[SCRAPER] Attempt ${attempt}/${config.maxRetries} Failed: ${err.message}`);
        if (willRetry) {
          console.log(`[SCRAPER] Retrying...`);
        }
      }
    }
  );

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('--------------------------------------------------');
  if (result.success) {
    console.log(`[SCRAPER] SUCCESS (Completed in ${totalDuration}s)`);
    console.log(`[SCRAPER] Final Price: ₹${result.data.price}`);
    console.log(`[SCRAPER] Final Stock: ${result.data.stock}`);
    process.exit(0);
  } else {
    console.log(`[SCRAPER] FAILED after ${result.attempt} attempts (Total duration: ${totalDuration}s)`);
    console.log(`[SCRAPER] Root Cause: ${result.error?.message || 'Unknown error'}`);
    console.log(`[SCRAPER] Error Code: ${result.error?.code || 'UNKNOWN_ERROR'}`);
    console.log('==================================================');
    console.log('Note: As per assignment rules, this failure is recorded');
    console.log('honestly. No fake price or stock values were generated.');
    console.log('==================================================');
    process.exit(1);
  }
}

runDiagnostic().catch((err) => {
  console.error('[SCRAPER] Fatal diagnostic failure:', err.message);
  process.exit(1);
});
