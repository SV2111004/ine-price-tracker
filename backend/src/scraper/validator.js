import { ValidationError } from './errors.js';

/**
 * Validates and normalizes a price string or number.
 * 
 * Rules:
 * - Must not be null or undefined
 * - Must parse to a non-negative finite number
 * - Normalizes rupee symbols, currency markers, commas, and whitespace
 * - Rejects non-price text or empty values
 * 
 * @param {string|number} rawPrice
 * @returns {number} Normalized price as a positive floating-point number
 */
export function validatePrice(rawPrice) {
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
    throw new ValidationError('Price is missing or empty');
  }

  if (typeof rawPrice === 'number') {
    if (isNaN(rawPrice) || !isFinite(rawPrice) || rawPrice < 0) {
      throw new ValidationError(`Invalid numeric price: ${rawPrice}`);
    }
    return Math.round(rawPrice * 100) / 100;
  }

  const str = String(rawPrice).trim();
  if (!str) {
    throw new ValidationError('Price string is empty');
  }

  // Remove currency signs (₹, Rs, Rs., INR, etc.), non-breaking spaces, commas, and common trailing labels like "/-"
  // E.g. "₹49,999", "Rs. 1,200/-", "49999", "₹ 2,499.00"
  let cleaned = str
    .replace(/(?:Rs\.?|INR|[₹\u20B9])/gi, '')
    .replace(/\/\-.*$/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .trim();

  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || !isFinite(parsed)) {
    throw new ValidationError(`Price "${str}" could not be parsed as a valid number`);
  }

  if (parsed < 0) {
    throw new ValidationError(`Price cannot be negative: ${parsed}`);
  }

  // Sanity check: product price shouldn't be impossibly gigantic (e.g. > 100,000,000) or corrupt
  if (parsed > 100000000) {
    throw new ValidationError(`Price exceeds reasonable boundary: ${parsed}`);
  }

  return Math.round(parsed * 100) / 100;
}

/**
 * Validates and normalizes stock information.
 * 
 * Rules:
 * - Must not be null or undefined
 * - Must indicate actual stock state (e.g. "In stock", "Out of stock", "5 left in stock", "12 in stock")
 * - If integer quantity is present, extracts numeric quantity alongside textual status
 * 
 * @param {string} rawStock
 * @returns {{ text: string, quantity: number | null, inStock: boolean }}
 */
export function validateStock(rawStock) {
  if (rawStock === null || rawStock === undefined || rawStock === '') {
    throw new ValidationError('Stock information is missing or empty');
  }

  const text = String(rawStock).trim();
  if (!text) {
    throw new ValidationError('Stock string is empty');
  }

  const lower = text.toLowerCase();

  // 1. Check for explicit out-of-stock states
  const isOutOfStock = lower.includes('out of stock') || lower.includes('sold out') || lower.includes('unavailable');
  if (isOutOfStock) {
    return {
      text: 'Out of stock',
      quantity: 0,
      inStock: false
    };
  }

  // 2. Check for recognized mock store stock patterns
  // Pattern examples:
  // - "In stock · 14 left"
  // - "Only 3 left"
  // - "12 in stock"
  // - "Selling fast — 2 left"
  // - "Hurry, just 1 left"
  // - "In stock"
  // - "15 units left"
  const isGeneralInStock = lower.includes('in stock') || lower.includes('available');
  const isLimitedStock = /only\s+\d+\s+left/i.test(text) ||
                         /selling\s+fast\s*[—–-]?\s*\d+\s+left/i.test(text) ||
                         /hurry,?\s+just\s+\d+\s+left/i.test(text) ||
                         /\d+\s+left\b/i.test(text);

  if (!isGeneralInStock && !isLimitedStock) {
    const digitMatch = lower.match(/^(\d+)\s*(?:units?|items?|left)?$/);
    if (!digitMatch) {
      throw new ValidationError(`Stock text "${text}" does not match recognized stock patterns`);
    }
  }

  // Extract quantity if mentioned (e.g. "12 in stock", "Only 3 left", "Selling fast — 2 left")
  const quantityMatch = text.match(/\b(\d+)\b/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1], 10) : null;

  return {
    text,
    quantity,
    inStock: quantity !== null ? quantity > 0 : true
  };
}
