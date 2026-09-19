import { describe, it, expect } from 'vitest';
import { validatePrice, validateStock } from '../src/scraper/validator.js';
import { ValidationError } from '../src/scraper/errors.js';

describe('Price Validator', () => {
  it('correctly parses rupee symbols, commas, and decimals', () => {
    expect(validatePrice('₹49,999')).toBe(49999);
    expect(validatePrice('₹ 1,234.50')).toBe(1234.5);
    expect(validatePrice('Rs. 500/-')).toBe(500);
    expect(validatePrice('Rs 25,000')).toBe(25000);
    expect(validatePrice('0')).toBe(0);
    expect(validatePrice(999.99)).toBe(999.99);
  });

  it('rejects invalid or empty prices', () => {
    expect(() => validatePrice('')).toThrow(ValidationError);
    expect(() => validatePrice(null)).toThrow(ValidationError);
    expect(() => validatePrice(undefined)).toThrow(ValidationError);
    expect(() => validatePrice('abc')).toThrow(ValidationError);
    expect(() => validatePrice(-100)).toThrow(ValidationError);
    expect(() => validatePrice(NaN)).toThrow(ValidationError);
  });
});

describe('Stock Validator', () => {
  it('correctly validates "In stock" and numeric quantity', () => {
    const res1 = validateStock('In stock');
    expect(res1.inStock).toBe(true);
    expect(res1.text).toBe('In stock');

    const res2 = validateStock('12 in stock');
    expect(res2.inStock).toBe(true);
    expect(res2.quantity).toBe(12);

    const res3 = validateStock('Only 3 left in stock');
    expect(res3.inStock).toBe(true);
    expect(res3.quantity).toBe(3);

    const res4 = validateStock('In stock · 14 left');
    expect(res4.inStock).toBe(true);
    expect(res4.quantity).toBe(14);

    const res5 = validateStock('Only 46 left');
    expect(res5.inStock).toBe(true);
    expect(res5.quantity).toBe(46);

    const res6 = validateStock('Selling fast — 3 left');
    expect(res6.inStock).toBe(true);
    expect(res6.quantity).toBe(3);

    const res7 = validateStock('Hurry, just 2 left');
    expect(res7.inStock).toBe(true);
    expect(res7.quantity).toBe(2);
  });

  it('correctly validates "Out of stock"', () => {
    const res = validateStock('Out of stock');
    expect(res.inStock).toBe(false);
    expect(res.text).toBe('Out of stock');
    expect(res.quantity).toBe(0);
  });

  it('rejects empty or gibberish stock text', () => {
    expect(() => validateStock('')).toThrow(ValidationError);
    expect(() => validateStock(null)).toThrow(ValidationError);
    expect(() => validateStock('Some unrelated description sentence')).toThrow(ValidationError);
  });
});
