-- SteelHub RLS Policies
-- Run this AFTER 001_initial_schema.sql in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE last_successful ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_sources ENABLE ROW LEVEL SECURITY;

-- Anon key: SELECT only on read tables
CREATE POLICY "anon_read_prices" ON prices FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_news" ON news FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_sentiment" ON sentiment_index FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_exchange_rates" ON exchange_rates FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_last_successful" ON last_successful FOR SELECT TO anon USING (true);

-- No INSERT/UPDATE/DELETE policies for anon = deny by default
-- Service role key automatically bypasses RLS (used by cron routes)
