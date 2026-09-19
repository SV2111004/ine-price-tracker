import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../src/scraper/retry.js';

describe('Retry Engine', () => {
  it('resolves immediately on first attempt if action succeeds', async () => {
    let callCount = 0;
    const action = vi.fn(async (attempt) => {
      callCount++;
      return { price: 100 };
    });

    const result = await withRetry(action, { maxAttempts: 3, initialDelayMs: 10 });

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(1);
    expect(result.data.price).toBe(100);
    expect(callCount).toBe(1);
  });

  it('retries on failure and succeeds on subsequent attempt', async () => {
    let callCount = 0;
    const action = vi.fn(async (attempt) => {
      callCount++;
      if (attempt === 1) throw new Error('Temporary network glitch');
      return { price: 200 };
    });

    const result = await withRetry(action, { maxAttempts: 3, initialDelayMs: 10 });

    expect(result.success).toBe(true);
    expect(result.attempt).toBe(2);
    expect(result.data.price).toBe(200);
    expect(callCount).toBe(2);
  });

  it('stops and reports failure when all bounded attempts are exhausted', async () => {
    let callCount = 0;
    const action = vi.fn(async (attempt) => {
      callCount++;
      throw new Error('Deterministic challenge failure');
    });

    const result = await withRetry(action, { maxAttempts: 3, initialDelayMs: 10 });

    expect(result.success).toBe(false);
    expect(result.attempt).toBe(3);
    expect(result.error.message).toBe('Deterministic challenge failure');
    expect(callCount).toBe(3);
  });
});
