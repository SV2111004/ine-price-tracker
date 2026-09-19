-- Migration: 001_initial_schema.sql
-- Enables UUID and creates tracked_products, price_history, and scrape_logs tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock VARCHAR(100) NOT NULL,
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL CHECK (status IN ('started', 'retrying', 'success', 'failed')),
    attempt_number INTEGER NOT NULL DEFAULT 1,
    price NUMERIC(12, 2),
    stock VARCHAR(100),
    error_message TEXT,
    response_time_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tracked_products_external_id ON tracked_products(external_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at ON price_history(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_id ON scrape_logs(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_started_at ON scrape_logs(started_at DESC);
