-- Add partner-specific columns to ai_comments
-- is_manual: true = admin wrote it directly (not AI generated)
-- partner_name: display name shown to store owner

ALTER TABLE ai_comments
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_name TEXT NOT NULL DEFAULT '担当パートナー';

-- Unique constraint: one comment per store per month
-- generated_at is stored as first day of month (YYYY-MM-01T00:00:00Z)
ALTER TABLE ai_comments
  DROP CONSTRAINT IF EXISTS ai_comments_store_month_unique;

ALTER TABLE ai_comments
  ADD CONSTRAINT ai_comments_store_month_unique
  UNIQUE (store_id, generated_at);

-- Index for fast lookup by store + date
CREATE INDEX IF NOT EXISTS idx_ai_comments_store_date
  ON ai_comments(store_id, generated_at DESC);
