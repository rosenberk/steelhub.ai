-- SteelHub Initial Schema
-- Run this in Supabase SQL Editor

-- Prices table
CREATE TABLE prices (
  id SERIAL PRIMARY KEY,
  product VARCHAR(20) NOT NULL,
  region VARCHAR(20) NOT NULL,
  country VARCHAR(30),
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  unit VARCHAR(10) DEFAULT 'MT',
  source VARCHAR(50),
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- News table
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  snippet TEXT,
  source VARCHAR(100),
  category VARCHAR(20) NOT NULL,
  region VARCHAR(20) NOT NULL,
  country VARCHAR(30),
  sentiment DECIMAL(3,2),
  confidence DECIMAL(3,2),
  published_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- Last successful data (fallback cache)
CREATE TABLE last_successful (
  id SERIAL PRIMARY KEY,
  data_type VARCHAR(20) NOT NULL,
  region VARCHAR(20) NOT NULL,
  payload JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_type, region)
);

-- Sentiment index (weekly snapshot)
CREATE TABLE sentiment_index (
  id SERIAL PRIMARY KEY,
  region VARCHAR(20) NOT NULL,
  category VARCHAR(20) NOT NULL,
  week_start DATE NOT NULL,
  avg_sentiment DECIMAL(3,2),
  news_count INTEGER,
  price_change_pct DECIMAL(5,2),
  correlation_score DECIMAL(3,2),
  divergence_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(region, category, week_start)
);

-- Login attempts (brute force protection)
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45),
  attempted_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

-- Rate limits
CREATE TABLE rate_limits (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(50),
  ip_address VARCHAR(45),
  window_start TIMESTAMP,
  request_count INTEGER DEFAULT 1,
  UNIQUE(endpoint, ip_address, window_start)
);

-- Exchange rates cache
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency VARCHAR(3) DEFAULT 'USD',
  target_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(12,6) NOT NULL,
  fetched_at TIMESTAMP DEFAULT NOW()
);

-- Discovered sources (dynamic source discovery)
CREATE TABLE discovered_sources (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(100) NOT NULL UNIQUE,
  region VARCHAR(20),
  category VARCHAR(20),
  hit_count INTEGER DEFAULT 1,
  quality_score DECIMAL(3,2),
  is_approved BOOLEAN DEFAULT FALSE,
  discovered_at TIMESTAMP DEFAULT NOW()
);

-- Unique indexes (expression-based — prevent duplicate daily entries)
CREATE UNIQUE INDEX idx_prices_unique_daily ON prices(product, region, country, (fetched_at::date));
CREATE UNIQUE INDEX idx_exchange_rates_unique_daily ON exchange_rates(target_currency, (fetched_at::date));

-- Performance indexes
CREATE INDEX idx_prices_region_product ON prices(region, product);
CREATE INDEX idx_prices_fetched ON prices(fetched_at DESC);
CREATE INDEX idx_news_region_category ON news(region, category);
CREATE INDEX idx_news_fetched ON news(fetched_at DESC);
CREATE INDEX idx_sentiment_week ON sentiment_index(week_start DESC);
CREATE INDEX idx_login_ip ON login_attempts(ip_address, attempted_at);
