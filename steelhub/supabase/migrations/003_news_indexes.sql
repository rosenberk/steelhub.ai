-- 003_news_indexes.sql
-- Unique index for news dedup (required for upsert ON CONFLICT)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_unique ON news(url) WHERE url IS NOT NULL;

-- Country filter performance
CREATE INDEX IF NOT EXISTS idx_news_country ON news(region, country);
