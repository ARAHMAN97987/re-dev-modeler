-- RE-DEV MODELER Database Schema
-- Run this in Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- Key-Value store for project data
CREATE TABLE IF NOT EXISTS kv_store (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_kv_store_user_key ON kv_store(user_id, key);
CREATE INDEX IF NOT EXISTS idx_kv_store_key_prefix ON kv_store(key text_pattern_ops);

-- Enable Row Level Security
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read/write (for now - add auth later)
CREATE POLICY "Allow all access" ON kv_store
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Market Data Snapshots ──
-- Stores quarterly market data snapshots for the automation engine.
-- Separate table for structured queries (vs kv_store for projects).
CREATE TABLE IF NOT EXISTS market_data_snapshots (
  id BIGSERIAL PRIMARY KEY,
  quarter TEXT NOT NULL,          -- e.g. "Q1-2026"
  year INTEGER NOT NULL,
  category TEXT NOT NULL,         -- construction_costs | lease_rates | fund_fees | financing_rates | hospitality | exit_rates
  data JSONB NOT NULL,            -- { "Retail.costPerSqm": { value: 4200, source: "knight-frank-ksa" }, ... }
  notes TEXT DEFAULT '',
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quarter, category)
);

CREATE INDEX IF NOT EXISTS idx_market_data_quarter ON market_data_snapshots(quarter);
CREATE INDEX IF NOT EXISTS idx_market_data_category ON market_data_snapshots(category);

ALTER TABLE market_data_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all market data access" ON market_data_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kv_store_updated_at
  BEFORE UPDATE ON kv_store
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
