import { logger } from '../utils/logger.js';

/**
 * Executes an async scraping action with bounded retries and exponential/linear backoff.
 * 
 * @param {Function} action - Async function taking (attemptNumber) => Promise<T>
 * @param {Object} options
 * @param {number} options.maxAttempts - Maximum number of attempts (default 3)
 * @param {number} options.initialDelayMs - Initial delay before retry (default 1000)
 * @param {number} options.backoffMultiplier - Multiplier for backoff (default 1.5)
 * @param {Function} options.onAttemptStart - (attempt) => void
 * @param {Function} options.onAttemptError - (error, attempt, willRetry) => void
 * @returns {Promise<T>}
 */
export async function withRetry(action, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const initialDelayMs = options.initialDelayMs || 1000;
  const backoffMultiplier = options.backoffMultiplier || 1.5;
  const onAttemptStart = options.onAttemptStart || (() => {});
  const onAttemptError = options.onAttemptError || (() => {});

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      onAttemptStart(attempt);
      const result = await action(attempt);
      return {
        success: true,
        attempt,
        data: result
      };
    } catch (err) {
      lastError = err;
      const willRetry = attempt < maxAttempts;
      onAttemptError(err, attempt, willRetry);

      if (willRetry) {
        const delay = Math.round(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1));
        logger.scraper(`Attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    attempt: maxAttempts,
    error: lastError
  };
}
