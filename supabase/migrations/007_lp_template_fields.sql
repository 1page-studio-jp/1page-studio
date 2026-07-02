-- ================================================================
-- 007_lp_template_fields.sql
-- lp_pages テーブルにテンプレート自動生成フィールドを追加
-- パートナーが直接編集できる項目
-- ================================================================

ALTER TABLE lp_pages
  -- テンプレート管理
  ADD COLUMN IF NOT EXISTS template_id     TEXT,               -- 使用テンプレートID（'salon'など）
  ADD COLUMN IF NOT EXISTS last_edited_by  UUID REFERENCES profiles(id), -- 最終編集者

  -- コピーライティング（テンプレート生成 → パートナー編集）
  ADD COLUMN IF NOT EXISTS sub_copy        TEXT,               -- サブコピー
  ADD COLUMN IF NOT EXISTS cta_text        TEXT,               -- CTAボタンテキスト
  ADD COLUMN IF NOT EXISTS line_cta_text   TEXT,               -- LINE登録ボタンテキスト
  ADD COLUMN IF NOT EXISTS line_benefit    TEXT,               -- LINE登録特典説明

  -- アピールポイント（既存 strengths を補完）
  ADD COLUMN IF NOT EXISTS appeal_points   TEXT[]  NOT NULL DEFAULT '{}',

  -- サービス・メニュー（構造化データ）
  -- [{name, description, price, tag}]
  ADD COLUMN IF NOT EXISTS services        JSONB   NOT NULL DEFAULT '[]',

  -- 特徴（箇条書き）
  ADD COLUMN IF NOT EXISTS features        TEXT[]  NOT NULL DEFAULT '{}',

  -- デザイン
  ADD COLUMN IF NOT EXISTS primary_color   TEXT    NOT NULL DEFAULT '#6366f1',  -- hex
  ADD COLUMN IF NOT EXISTS accent_color    TEXT    NOT NULL DEFAULT '#eef2ff',

  -- SEO / 広告
  ADD COLUMN IF NOT EXISTS seo_title       TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS target_keywords TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ad_headline     TEXT;   -- 広告見出しのテンプレート

-- パートナー編集を activity_log に記録するための slug 追加確認（元テーブルになければ追加）
ALTER TABLE lp_pages
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- slug に一意インデックス（nullを許容）
CREATE UNIQUE INDEX IF NOT EXISTS idx_lp_pages_slug_notnull
  ON lp_pages(slug) WHERE slug IS NOT NULL;
