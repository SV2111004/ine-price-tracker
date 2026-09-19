export class ScraperError extends Error {
  constructor(message, code = 'SCRAPE_ERROR', metadata = {}) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.metadata = metadata;
  }
}

export class ChallengeFailedError extends ScraperError {
  constructor(message = 'Store challenge verification failed (HTTP 401 / challenge_failed)', metadata = {}) {
    super(message, 'CHALLENGE_FAILED', metadata);
    this.name = 'ChallengeFailedError';
  }
}

export class NavigationTimeoutError extends ScraperError {
  constructor(message = 'Timed out navigating to product page', metadata = {}) {
    super(message, 'NAVIGATION_TIMEOUT', metadata);
    this.name = 'NavigationTimeoutError';
  }
}

export class StructureChangeError extends ScraperError {
  constructor(message = 'Expected price or stock structure not found in DOM', metadata = {}) {
    super(message, 'POSSIBLE_PAGE_STRUCTURE_CHANGE', metadata);
    this.name = 'StructureChangeError';
  }
}

export class ValidationError extends ScraperError {
  constructor(message, metadata = {}) {
    super(message, 'VALIDATION_FAILED', metadata);
    this.name = 'ValidationError';
  }
}

export class PriceExtractionError extends ScraperError {
  constructor(message = 'Price could not be extracted from the page', metadata = {}) {
    super(message, 'PRICE_EXTRACTION_FAILED', metadata);
    this.name = 'PriceExtractionError';
  }
}

export class StockExtractionError extends ScraperError {
  constructor(message = 'Stock could not be extracted from the page', metadata = {}) {
    super(message, 'STOCK_EXTRACTION_FAILED', metadata);
    this.name = 'StockExtractionError';
  }
}
