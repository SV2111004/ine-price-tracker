-- ============================================================================
-- INE PRODUCT PRICE TRACKER - SUPABASE POSTGRESQL SCHEMA (PHASE 3)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TRACKED PRODUCTS TABLE
-- Prevents accidental duplicate tracking via UNIQUE constraint on external_product_id
CREATE TABLE IF NOT EXISTS tracked_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_product_id VARCHAR(64) NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    product_url TEXT NOT NULL,
    image_url TEXT,
    category VARCHAR(100),
    sku VARCHAR(100),
    tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_scraped_at TIMESTAMPTZ,
    last_scrape_status VARCHAR(32) NOT NULL DEFAULT 'never_scraped'
);

-- 2. SCRAPE LOGS TABLE
-- Records EVERY scrape attempt honestly (started, retrying, success, failed)
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL CHECK (status IN ('started', 'retrying', 'success', 'failed')),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    http_status INTEGER,
    error_type VARCHAR(64),
    error_message TEXT,
    duration_ms INTEGER,
    extracted_price NUMERIC(12, 2),
    extracted_stock VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. PRICE HISTORY TABLE
-- Strict integrity rule: Only valid prices and verified stock are stored here.
-- Never insert null/empty/invalid price as if it were a successful scrape.
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    stock VARCHAR(100) NOT NULL,
    scrape_log_id UUID REFERENCES scrape_logs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING & AUDITING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tracked_products_external_id ON tracked_products(external_product_id);
CREATE INDEX IF NOT EXISTS idx_tracked_products_enabled ON tracked_products(tracking_enabled);
CREATE INDEX IF NOT EXISTS idx_tracked_products_updated_at ON tracked_products(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at ON price_history(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_scrape_log_id ON price_history(scrape_log_id);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_id ON scrape_logs(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_started_at ON scrape_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_status ON scrape_logs(status);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS set_tracked_products_updated_at ON tracked_products;
CREATE TRIGGER set_tracked_products_updated_at
BEFORE UPDATE ON tracked_products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
