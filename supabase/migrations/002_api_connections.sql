-- ============================================================
-- 002: API連携強化・マルチテナント拡張
-- ============================================================

-- ============================================================
-- PLATFORM_CONNECTIONS
-- 将来のOAuth API連携を管理する専用テーブル
-- ad_accountsより詳細な連携情報を持つ
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- 連携プラットフォーム
  platform TEXT NOT NULL CHECK (platform IN (
    'google_ads',
    'google_business_profile',
    'meta_ads',        -- Facebook + Instagram 統合
    'line_official',
    'google_analytics'
  )),

  -- 接続状態
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN (
    'connected',       -- 正常接続中
    'disconnected',    -- 未接続
    'error',           -- エラー（再接続必要）
    'expired',         -- トークン期限切れ
    'pending'          -- OAuth フロー処理中
  )),

  -- OAuth トークン（暗号化済み）
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,

  -- 外部アカウント情報
  external_account_id TEXT,
  external_account_name TEXT,

  -- 同期情報
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_frequency_hours INTEGER NOT NULL DEFAULT 24,

  -- エラー情報
  error_message TEXT,
  error_at TIMESTAMPTZ,

  -- メタデータ（プラットフォーム固有の設定をJSONで保持）
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(store_id, platform)
);

-- ============================================================
-- PLATFORM_SYNC_LOGS
-- API同期の実行履歴
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- STORE_METRICS_CACHE
-- ダッシュボード高速表示のためのキャッシュテーブル
-- 日次バッチで更新する
-- ============================================================
CREATE TABLE IF NOT EXISTS store_metrics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cache_date DATE NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('today', 'week', 'month')),

  -- 集計値
  total_cost NUMERIC(12,2) DEFAULT 0,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_lp_views INTEGER DEFAULT 0,
  total_line_adds INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  total_reservations INTEGER DEFAULT 0,
  total_coupon_uses INTEGER DEFAULT 0,

  -- 計算指標
  roas NUMERIC(8,2) DEFAULT 0,
  cpa NUMERIC(10,2) DEFAULT 0,
  ctr NUMERIC(6,2) DEFAULT 0,
  cvr NUMERIC(6,2) DEFAULT 0,
  line_add_rate NUMERIC(6,2) DEFAULT 0,
  score INTEGER DEFAULT 0,

  -- プラットフォーム別内訳（JSON）
  platform_breakdown JSONB DEFAULT '{}',

  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(store_id, cache_date, period)
);

-- ============================================================
-- PARTNER_NOTES
-- 担当パートナーが店舗ごとにメモを残せる
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,   -- true = 管理者のみ閲覧
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ad_daily_reportsにdata_sourceカラム追加（既存テーブル拡張）
-- ============================================================
ALTER TABLE ad_daily_reports
  ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (data_source IN ('manual', 'csv', 'api'));

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_platform_connections_store ON platform_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_status ON platform_connections(store_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_sync_logs_store ON platform_sync_logs(store_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_metrics_cache_store ON store_metrics_cache(store_id, cache_date DESC);
CREATE INDEX IF NOT EXISTS idx_partner_notes_store ON partner_notes(store_id, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON platform_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partner_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_notes ENABLE ROW LEVEL SECURITY;

-- platform_connections: 店舗オーナー自身 or 管理者
CREATE POLICY "pc_select" ON platform_connections FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "pc_insert" ON platform_connections FOR INSERT WITH CHECK (can_access_store(store_id));
CREATE POLICY "pc_update" ON platform_connections FOR UPDATE USING (can_access_store(store_id));
CREATE POLICY "pc_delete" ON platform_connections FOR DELETE USING (get_my_role() = 'admin');

-- platform_sync_logs: 読み取りのみ
CREATE POLICY "psl_select" ON platform_sync_logs FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "psl_insert" ON platform_sync_logs FOR INSERT WITH CHECK (get_my_role() = 'admin');

-- store_metrics_cache
CREATE POLICY "smc_select" ON store_metrics_cache FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "smc_all_admin" ON store_metrics_cache FOR ALL USING (get_my_role() = 'admin');

-- partner_notes: 管理者はすべて、オーナーはis_private=falseのみ
CREATE POLICY "pn_select_admin" ON partner_notes FOR SELECT USING (
  get_my_role() = 'admin' OR (can_access_store(store_id) AND is_private = false)
);
CREATE POLICY "pn_insert_admin" ON partner_notes FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "pn_update_admin" ON partner_notes FOR UPDATE USING (get_my_role() = 'admin' AND author_id = auth.uid());
CREATE POLICY "pn_delete_admin" ON partner_notes FOR DELETE USING (get_my_role() = 'admin');

-- ============================================================
-- HELPER FUNCTION: 店舗の集客スコアを計算して返す
-- ============================================================
CREATE OR REPLACE FUNCTION calc_store_score(p_store_id UUID, p_month TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_lp_views INTEGER;
  v_line_adds INTEGER;
  v_inquiries INTEGER;
  v_reservations INTEGER;
  v_cost NUMERIC;
  v_sales NUMERIC;
  v_score INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(lp_views), 0),
    COALESCE(SUM(line_adds), 0),
    COALESCE(SUM(inquiries), 0),
    COALESCE(SUM(reservations), 0),
    COALESCE(SUM(cost), 0),
    COALESCE(SUM(sales), 0)
  INTO v_lp_views, v_line_adds, v_inquiries, v_reservations, v_cost, v_sales
  FROM ad_daily_reports
  WHERE store_id = p_store_id
    AND TO_CHAR(date, 'YYYY-MM') = p_month;

  -- スコア算出（0〜100）
  v_score := 0;
  IF v_lp_views > 0 THEN
    -- LINE登録率 30点
    v_score := v_score + LEAST(30, ROUND((v_line_adds::NUMERIC / v_lp_views) * 600));
    -- 問い合わせ率 25点
    v_score := v_score + LEAST(25, ROUND((v_inquiries::NUMERIC / v_lp_views) * 833));
    -- 予約率 25点
    v_score := v_score + LEAST(25, ROUND((v_reservations::NUMERIC / v_lp_views) * 1250));
  END IF;
  -- ROAS 20点
  IF v_cost > 0 AND v_sales > 0 THEN
    v_score := v_score + LEAST(20, ROUND((v_sales / v_cost) * 4));
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
