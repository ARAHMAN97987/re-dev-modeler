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
