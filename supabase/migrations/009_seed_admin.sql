-- ============================================================
-- 009_seed_admin.sql
-- 初期管理者アカウントのセットアップ
--
-- 使い方:
--   1. Supabase ダッシュボード > Authentication > Users で
--      管理者ユーザーをメールアドレスで招待
--   2. そのユーザーの UUID を確認
--   3. 下記の YOUR_ADMIN_UUID / YOUR_ADMIN_EMAIL を置き換えて実行
--
-- ※ このファイルは直接 supabase db push せず、
--    Supabase SQL エディターで手動実行してください。
-- ============================================================

-- Step 1: profiles テーブルの role を 'admin' に変更
-- （auth.users に登録後に自動で profiles が作成されるので、そのあとこれを実行）
UPDATE profiles
SET role = 'admin'
WHERE email = 'YOUR_ADMIN_EMAIL@example.com';

-- ── または UUID で指定 ──
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = 'YOUR_ADMIN_UUID';

-- ============================================================
-- サンプル店舗・サンプルデータ（開発環境のみ）
-- 本番では不要。コメントアウト状態のまま残しておく。
-- ============================================================

/*
-- サンプル店舗
INSERT INTO stores (
  id, owner_id, store_name, industry, address, phone_number, status, slug
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  'COCO美容室 渋谷店',
  'salon',
  '東京都渋谷区渋谷1-1-1',
  '03-0000-0000',
  'active',
  'coco-shibuya'
);

-- サンプルLP
INSERT INTO lp_pages (
  store_id, title, catch_copy, sub_copy, status,
  appeal_points, cta_text, line_cta_text, line_benefit,
  primary_color, template_id
) VALUES (
  (SELECT id FROM stores WHERE slug = 'coco-shibuya'),
  'サロン集客LP（メイン）',
  'あなたのなりたいを、一番近くで叶えるサロン',
  'カウンセリングから始まるオーダーメイドスタイル',
  'published',
  ARRAY['カウンセリングから始まるオーダーメイドスタイル', '厳選した天然素材のカラー剤を使用', '完全予約制でプライベートな空間'],
  '今すぐ無料相談する',
  'LINEで今すぐ予約する',
  'LINE登録で初回トリートメント20%OFF',
  '#ec4899',
  'salon'
);

-- サンプル成功事例
INSERT INTO success_cases (industry_id, case_type, title, result_summary, result_metric, is_featured)
VALUES
  ('salon', 'coupon', '初回限定クーポンでLINE登録200件突破',
   '初回トリートメント20%OFFクーポンをLPに設置し、LINE友達登録と連動。配信から30日でLINE登録200件を達成。',
   'LINE登録数 +200件（30日間）', true),
  ('restaurant', 'coupon', 'ランチタイム限定クーポンで平日集客を底上げ',
   'LINE配信でランチタイム限定クーポンを水曜・木曜に送付。',
   '平日ランチ売上 +35%（2ヶ月）', false),
  ('salon', 'ad_copy', '「渋谷で一番やさしい美容室」コピーでCTR2倍',
   '機能訴求から感情訴求へコピーをシフトしたところ広告CTRが倍増。',
   '広告CTR 1.2% → 2.4%', true);
*/

-- ============================================================
-- RLS: 管理者サービスロールキー（バックエンド操作）向けポリシー
-- サービスロールキーを使う場合は RLS をバイパスするため不要ですが
-- 念のため確認用ポリシーを記載
-- ============================================================

-- 全テーブルで admin が全権限を持つことを確認
-- （001_initial_schema.sql の既存ポリシーで対応済み）

-- ============================================================
-- ストレージバケット作成（画像アップロード用）
-- Supabase Storage > New Bucket で手動作成、または以下SQLで実行
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lp-images', 'lp-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage ポリシー: 認証ユーザーはアップロード可、全員は閲覧可
CREATE POLICY "Public read lp-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lp-images');

CREATE POLICY "Authenticated upload lp-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lp-images' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete lp-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lp-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read store-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-assets');

CREATE POLICY "Authenticated upload store-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');
