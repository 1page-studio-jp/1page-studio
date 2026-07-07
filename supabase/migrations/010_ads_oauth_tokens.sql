-- Migration 010: Google Ads / Meta Ads OAuthトークン管理テーブル

CREATE TABLE IF NOT EXISTS store_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_ads', 'meta_ads')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id TEXT,        -- Google Ads: Customer ID / Meta: Ad Account ID
  account_name TEXT,      -- 表示用アカウント名
  scopes TEXT,            -- 付与されたスコープ
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, provider)
);

-- RLS
ALTER TABLE store_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可（オーナーには見せない）
CREATE POLICY "Admins can manage oauth tokens"
  ON store_oauth_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM store_users su
      WHERE su.store_id = store_oauth_tokens.store_id
      AND su.user_id = auth.uid()
      AND su.permission_role IN ('admin', 'owner')
    )
  );

-- 広告データ同期ログ
CREATE TABLE IF NOT EXISTS ads_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  sync_date DATE NOT NULL,
  status TEXT CHECK (status IN ('success', 'error', 'skipped')),
  records_inserted INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ads_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON ads_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM store_users su
      WHERE su.store_id = ads_sync_logs.store_id
      AND su.user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_store_oauth_tokens_updated_at
  BEFORE UPDATE ON store_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
