-- ============================================================
-- 008_partner_notes.sql
-- パートナーノート: 管理者が各店舗に書き込むメモ・コメント
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  content       TEXT NOT NULL,
  is_private    BOOLEAN NOT NULL DEFAULT false, -- true = 管理者のみ閲覧, false = オーナーも閲覧可

  -- Metadata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_partner_notes_store_id
  ON partner_notes(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_notes_author
  ON partner_notes(author_id);

-- Updated_at trigger
CREATE TRIGGER set_updated_at_partner_notes
  BEFORE UPDATE ON partner_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE partner_notes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "partner_notes_admin_all"
  ON partner_notes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Owners can read non-private notes for their store
CREATE POLICY "partner_notes_owner_read"
  ON partner_notes FOR SELECT
  USING (
    is_private = false
    AND can_access_store(store_id)
  );
