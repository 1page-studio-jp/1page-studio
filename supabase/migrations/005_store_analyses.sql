-- ============================================================
-- 005_store_analyses.sql
-- AI-generated daily store analysis (強み/弱み/改善提案/優先順位)
-- Partners can override the AI output per store per day.
-- ============================================================

CREATE TABLE store_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  analysis_date   DATE NOT NULL DEFAULT CURRENT_DATE,

  -- AI-generated content (arrays / JSON)
  strengths       TEXT[]  NOT NULL DEFAULT '{}',   -- ["LINE登録率が高い", ...]
  weaknesses      TEXT[]  NOT NULL DEFAULT '{}',   -- ["LP→LINE転換率が低い", ...]
  suggestions     JSONB   NOT NULL DEFAULT '[]',   -- [{text, category, priority_rank}]
  priorities      TEXT[]  NOT NULL DEFAULT '{}',   -- ordered list of next actions

  -- Partner override
  is_partner_edited   BOOLEAN       NOT NULL DEFAULT false,
  partner_note        TEXT,                        -- free-form comment from partner
  edited_at           TIMESTAMPTZ,
  edited_by           UUID REFERENCES profiles(id),

  -- Metadata
  ai_model        TEXT    NOT NULL DEFAULT 'gpt-4o-mini',
  ai_generated_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (store_id, analysis_date)
);

-- Indexes
CREATE INDEX idx_store_analyses_store_date
  ON store_analyses(store_id, analysis_date DESC);

-- RLS: store owners can read their own; admins can do everything
ALTER TABLE store_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_analyses_owner_read"
  ON store_analyses FOR SELECT
  USING (can_access_store(store_id));

CREATE POLICY "store_analyses_admin_all"
  ON store_analyses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- suggestions JSONB shape (for reference, not enforced at DB level):
-- [
--   {
--     "text": "LPのLINE登録ボタンを上部に移動する",
--     "category": "lp" | "line" | "ad" | "coupon" | "google" | "general",
--     "priority_rank": 1   -- 1 = highest priority
--   }
-- ]
