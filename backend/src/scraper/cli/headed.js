import { scrapeProductPage } from '../productScraper.js';
import { withRetry } from '../retry.js';
import { config } from '../../config/env.js';

async function runHeadedDemo() {
  const args = process.argv.slice(2);
  const simulateRetry = args.includes('--simulate-retry');
  const productId = args.find(a => !a.startsWith('--')) || '614';
  const productUrl = `${config.mockStoreBaseUrl}/product/${productId}`;
  const startTime = Date.now();

  console.log('================================================================');
  console.log('       INE PRICE TRACKER — VISIBLE HEADED DEMONSTRATION         ');
  console.log('================================================================');
  console.log(`[INFO] Starting headed scrape`);
  console.log(`[INFO] Product ID: ${productId}`);
  console.log(`[INFO] Product URL: ${productUrl}`);
  console.log(`[INFO] Browser Engine: Chromium (Visible Headed Mode)`);
  console.log(`[INFO] Max Bounded Retries: ${config.maxRetries}`);
  if (simulateRetry) {
    console.log(`[INFO] Retry Simulation Mode: ENABLED (Will simulate attempt 1 glitch)`);
  }
  console.log('----------------------------------------------------------------');

  let simulatedGlitchHappened = false;

  const result = await withRetry(
    async (attempt) => {
      console.log(`[INFO] Attempt ${attempt}/${config.maxRetries}`);
      console.log(`[INFO] Opening browser and navigating to ${productUrl}...`);
      console.log(`[INFO] Waiting for product page content and container...`);

      if (simulateRetry && attempt === 1 && !simulatedGlitchHappened) {
        simulatedGlitchHappened = true;
        console.log(`[WARN] Simulated network stall/timeout on attempt 1 to demonstrate retry`);
        throw new Error('Simulated transient network timeout for screen recording demo');
      }

      const scrapeResult = await scrapeProductPage({
        productId,
        productUrl,
        headed: true, // Visible browser window
        attempt
      });

      console.log(`[SUCCESS] Price: ₹${scrapeResult.price} (raw: "${scrapeResult.rawPrice}")`);
      console.log(`[SUCCESS] Stock: ${scrapeResult.stock}`);
      return scrapeResult;
    },
    {
      maxAttempts: config.maxRetries,
      initialDelayMs: 2000,
      onAttemptError: (err, attempt, willRetry) => {
        console.log(`[WARN] Attempt ${attempt} encountered error: ${err.message}`);
        if (willRetry) {
          const delay = 2000 * Math.pow(1.5, attempt - 1);
          console.log(`[INFO] Retrying in ${Math.round(delay)}ms with backoff...`);
        }
      }
    }
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('----------------------------------------------------------------');
  if (result.success) {
    console.log(`[SUCCESS] Headed scrape completed in ${duration}s`);
    console.log(`[INFO] Validated Price: ₹${result.data.price}`);
    console.log(`[INFO] Validated Stock: ${result.data.stock}`);
    console.log(`[INFO] Scrape result ready for persistence in Supabase PostgreSQL`);
    process.exit(0);
  } else {
    console.log(`[FAILED] Headed scrape exhausted ${result.attempt} attempts in ${duration}s`);
    console.log(`[WARN] Root Cause: ${result.error?.message}`);
    console.log(`[INFO] As required: failure is logged honestly without recording fake data.`);
    process.exit(1);
  }
}

runHeadedDemo().catch((err) => {
  console.error('[FATAL] Headed execution failed:', err.message);
  process.exit(1);
});
