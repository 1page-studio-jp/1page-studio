-- ================================================================
-- 006_success_cases.sql
-- 成功事例ライブラリ
-- 業種別に「最も効果があったLP・クーポン・広告文・LINEメッセージ」を蓄積
-- ================================================================

CREATE TABLE IF NOT EXISTS success_cases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 分類
  industry_id  TEXT NOT NULL,          -- 'salon' | 'restaurant' | 'osteopathy' | 'gym' | ...
  case_type    TEXT NOT NULL,          -- 'lp' | 'coupon' | 'ad_copy' | 'line_message'
  title        TEXT NOT NULL,          -- 事例タイトル（管理者が付ける）

  -- 実績データ
  result_summary   TEXT NOT NULL,      -- 「LINE登録が2倍に増加」などの結果
  result_metric    TEXT,               -- 数値指標（例：LINE登録率 12% → 28%）
  period_start     DATE,
  period_end       DATE,

  -- コンテンツ本体
  content      TEXT NOT NULL,          -- LP内容 / クーポン文言 / 広告文 / LINEメッセージ
  content_url  TEXT,                   -- LP URLやスクリーンショットURL

  -- 参照元店舗（任意 — 非公開にする場合は null）
  source_store_id  UUID REFERENCES stores(id) ON DELETE SET NULL,
  is_source_public BOOLEAN NOT NULL DEFAULT false,  -- 店舗名を表示するか

  -- 管理
  tags         TEXT[] NOT NULL DEFAULT '{}',
  is_featured  BOOLEAN NOT NULL DEFAULT false,  -- おすすめ表示
  view_count   INT NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_success_cases_industry ON success_cases(industry_id);
CREATE INDEX IF NOT EXISTS idx_success_cases_type     ON success_cases(case_type);
CREATE INDEX IF NOT EXISTS idx_success_cases_featured ON success_cases(is_featured) WHERE is_featured = true;

-- RLS
ALTER TABLE success_cases ENABLE ROW LEVEL SECURITY;

-- オーナー: 自分の業種の成功事例を読める
CREATE POLICY "Owner can read success cases for their industry"
  ON success_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      JOIN store_users su ON su.store_id = s.id
      WHERE su.user_id = auth.uid()
        AND su.permission_role = 'owner'
    )
  );

-- Admin: すべての操作
CREATE POLICY "Admin full access on success_cases"
  ON success_cases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_success_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER success_cases_updated_at
  BEFORE UPDATE ON success_cases
  FOR EACH ROW EXECUTE FUNCTION update_success_cases_updated_at();

-- サンプルデータ（美容室）
INSERT INTO success_cases (industry_id, case_type, title, result_summary, result_metric, content, is_featured, tags) VALUES
(
  'salon', 'coupon',
  '初回20%OFFクーポンで新規LINE登録2.4倍',
  'クーポン内容を「初回10%OFF」から「初回20%OFF」に変更したところ、LINE登録率が大きく向上した。',
  'LINE登録率 8% → 19%',
  '【LINE登録で初回20%OFFクーポンをプレゼント🎁】
縮毛矯正・カット・カラーすべてのメニューで使えます。
ご予約はLINEから24時間受付中！
期限：登録から30日間有効',
  true,
  ARRAY['クーポン', 'LINE登録', '美容室', '初回割引']
),
(
  'salon', 'ad_copy',
  '「くせ毛」訴求で広告クリック率1.8倍',
  '「美容室」の一般訴求から「くせ毛・縮毛矯正」の悩み訴求に変更。クリック率が大幅改善。',
  'クリック率 1.2% → 2.1%',
  '【広告見出し】くせ毛・うねりにお悩みの方へ｜渋谷の縮毛矯正専門サロン
【説明文】毎朝のくせ毛セットに疲れていませんか？薬剤を髪質に合わせて調合するため、ダメージを最小限に。初回LINE登録で20%OFFクーポンプレゼント中。',
  true,
  ARRAY['広告', 'クリック率', '訴求改善', '縮毛矯正']
),
(
  'restaurant', 'coupon',
  'ドリンク無料クーポンで来店率35%向上',
  '「500円OFF」から「ドリンク1杯無料」に変更。同じ原価でも来店率が向上した。',
  'クーポン利用率 18% → 35%',
  '【LINE登録特典】ドリンク1杯無料クーポン🍺
生ビール・ソフトドリンク・ウーロン茶からお選びください。
2名様以上のご来店でご利用いただけます。
有効期限：発行日から60日間',
  true,
  ARRAY['クーポン', '飲食店', '来店促進', '無料提供']
),
(
  'gym', 'lp',
  '「3ヶ月で〇kg減」具体的実績提示でCV率2倍',
  'キャッチコピーを抽象的な表現から「3ヶ月で平均6.2kg減」の具体的数字に変更。',
  'LP→LINE登録率 4% → 9%',
  'キャッチコピー：3ヶ月で平均6.2kg減｜マンツーマンで必ず結果を出すパーソナルジム
サブコピー：「続かない」「結果が出ない」を解決。食事管理+トレーニングの完全サポートで、あなたの目標を最短で達成します。
実績紹介：[ビフォーアフター写真3枚] 30代女性・-8kg / 40代男性・-5kg / 20代女性・-10kg',
  true,
  ARRAY['LP', 'キャッチコピー', 'ジム', '実績訴求']
);
