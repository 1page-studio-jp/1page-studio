-- ================================================================
-- 003_store_milestones.sql
-- タイムライン機能：店舗ごとの改善履歴・マイルストーン管理
-- ================================================================

-- マイルストーンカテゴリ
CREATE TYPE milestone_category AS ENUM (
  'lp',          -- LP関連 (公開・更新・改善)
  'line',        -- LINE関連 (設定・配信・登録数達成)
  'ad',          -- 広告関連 (開始・改善・停止)
  'coupon',      -- クーポン関連
  'google',      -- Google (口コミ・MEO)
  'inquiry',     -- 問い合わせ・予約の成果
  'revenue',     -- 売上・来店成果
  'other'        -- その他
);

-- store_milestones テーブル
CREATE TABLE store_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- 内容
  title         TEXT NOT NULL,                      -- 例: "LP公開", "LINE配信開始"
  description   TEXT,                               -- 任意の補足
  category      milestone_category NOT NULL DEFAULT 'other',
  icon          TEXT,                               -- lucide icon name (optional)

  -- 数値インパクト (任意)
  metric_label  TEXT,                               -- 例: "問い合わせ"
  metric_value  TEXT,                               -- 例: "+18%", "+12件"
  metric_up     BOOLEAN DEFAULT true,               -- 上昇/下降

  -- 日時
  happened_at   DATE NOT NULL,                      -- 実際に起きた日付
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 作成者
  created_by    UUID REFERENCES profiles(id),
  is_auto       BOOLEAN DEFAULT false,              -- システム自動生成 vs 手動

  -- 論理削除
  deleted_at    TIMESTAMPTZ
);

-- インデックス
CREATE INDEX idx_milestones_store_id   ON store_milestones (store_id, happened_at DESC);
CREATE INDEX idx_milestones_happened   ON store_milestones (happened_at DESC);

-- RLS
ALTER TABLE store_milestones ENABLE ROW LEVEL SECURITY;

-- オーナー: 自分の店舗のマイルストーンを閲覧
CREATE POLICY "owner_read_milestones" ON store_milestones
  FOR SELECT
  USING (can_access_store(store_id) AND deleted_at IS NULL);

-- 管理者: 全操作
CREATE POLICY "admin_all_milestones" ON store_milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- updated_at 自動更新
CREATE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON store_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- 自動マイルストーン生成: LP公開時
-- ================================================================
CREATE OR REPLACE FUNCTION auto_milestone_lp_publish()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 新規公開 (draft→published)
  IF OLD.status <> 'published' AND NEW.status = 'published' THEN
    INSERT INTO store_milestones (
      store_id, title, category, happened_at, is_auto
    ) VALUES (
      NEW.store_id,
      'LP を公開しました',
      'lp',
      CURRENT_DATE,
      true
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_milestone_lp
  AFTER UPDATE ON lp_pages
  FOR EACH ROW EXECUTE FUNCTION auto_milestone_lp_publish();

-- ================================================================
-- サンプルデータ関数 (開発用)
-- ================================================================
-- SELECT seed_sample_milestones('<store_id>');
CREATE OR REPLACE FUNCTION seed_sample_milestones(p_store_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO store_milestones (store_id, title, category, happened_at, metric_label, metric_value, metric_up, is_auto)
  VALUES
    (p_store_id, 'LP 公開',               'lp',       CURRENT_DATE - 21, NULL,         NULL,   true,  true),
    (p_store_id, 'Google 口コミ返信 開始', 'google',   CURRENT_DATE - 18, NULL,         NULL,   true,  false),
    (p_store_id, 'LINE 配信 第1回',        'line',     CURRENT_DATE - 14, 'LINE登録',   '+23件', true, false),
    (p_store_id, '広告キーワード改善',     'ad',       CURRENT_DATE - 7,  NULL,         NULL,   true,  false),
    (p_store_id, '問い合わせ数が増加',     'inquiry',  CURRENT_DATE - 2,  '問い合わせ', '+18%', true,  true);
END;
$$;
