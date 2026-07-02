# 1Page Studio — MVP セットアップガイド

店舗集客を一元管理するプラットフォーム。  
LP・クーポン・問い合わせ・AIコメント・ダッシュボードを店舗ごとに管理できるマルチテナントSaaS。

---

## 技術スタック

| 領域 | 技術 |
|------|------|
| フロントエンド | Next.js 14 (App Router) + TypeScript |
| スタイリング | Tailwind CSS |
| バックエンド/DB | Supabase (PostgreSQL + Auth + RLS) |
| AI | OpenAI GPT-4o-mini |
| デプロイ推奨 | Vercel |

---

## セットアップ手順

### 1. リポジトリの準備

```bash
cd 1page-studio
npm install
cp .env.example .env.local
```

### 2. Supabase プロジェクト作成

1. [supabase.com](https://supabase.com) にアクセスし、新規プロジェクトを作成
2. プロジェクト設定 → API から以下を取得:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. データベース初期化

Supabase ダッシュボード → SQL Editor を開き、以下を実行:

```
supabase/migrations/001_initial_schema.sql
```

の内容をすべてコピーして実行してください。

### 4. 管理者アカウントを手動作成

Supabase ダッシュボード → Authentication → Users → 「Add user」から作成:
- Email: `admin@yourcompany.com`
- Password: `任意の強力なパスワード`

作成後、SQL Editor で以下を実行してロールを admin に変更:

```sql
UPDATE profiles 
SET role = 'admin', name = '管理者'
WHERE email = 'admin@yourcompany.com';
```

### 5. 環境変数を設定

`.env.local` を以下の内容で作成:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. 開発サーバー起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000/login` を開き、管理者アカウントでログインできます。

---

## 使い方

### 管理者の操作

1. `/login` でログイン → 自動的に `/admin` へ
2. 「新規店舗追加」から店舗とオーナーアカウントを作成
3. 各店舗の「ダッシュボード」で状況確認
4. 「AI分析を生成」でAIコメント・改善提案を生成し、承認して店舗へ届ける

### 店舗オーナーの操作

1. 発行されたメール・パスワードでログイン → `/dashboard/[storeId]` へ
2. **LP管理** → LP作成（AI文章生成あり）→ 公開
3. 公開LPのURL: `/lp/[店舗スラグ]`
4. 毎日ダッシュボードで集客スコアとAIコメントを確認

---

## ディレクトリ構成

```
1page-studio/
├── app/
│   ├── login/              ← ログイン画面
│   ├── admin/              ← 管理者画面
│   │   ├── page.tsx        ← 管理ダッシュボード
│   │   └── stores/         ← 店舗管理
│   ├── dashboard/
│   │   └── [storeId]/      ← 店舗オーナー画面
│   │       ├── page.tsx    ← ダッシュボード
│   │       ├── lp/         ← LP管理
│   │       └── inquiries/  ← 問い合わせ
│   ├── lp/
│   │   └── [slug]/         ← 公開LPページ（スマホ最適化）
│   └── api/                ← API Routes
│       ├── admin/stores/   ← 店舗作成API
│       ├── lp/             ← LP CRUD API
│       ├── ai/             ← OpenAI連携API
│       └── public/         ← 認証不要API（問い合わせ受付）
├── components/
│   ├── ui/                 ← ボタン・カード等の基本UI
│   ├── layout/             ← サイドバー・モバイルナビ
│   └── dashboard/          ← ダッシュボード用コンポーネント
├── lib/
│   ├── supabase/           ← Supabaseクライアント
│   ├── openai.ts           ← OpenAI連携
│   └── utils.ts            ← ユーティリティ関数
├── supabase/
│   └── migrations/         ← DBスキーマ（SQL）
└── types/
    └── index.ts            ← 型定義
```

---

## 主な機能

| 機能 | 説明 |
|------|------|
| マルチテナント | 店舗ごとに完全データ分離（RLS） |
| ログイン | メール/パスワード認証（Supabase Auth） |
| 管理者画面 | 全店舗一覧・店舗作成・KPI確認 |
| 店舗ダッシュボード | 集客スコア・今日/今月の実績・AIコメント |
| LP作成 | AI文章生成補助・公開/下書き管理 |
| 公開LPページ | スマホ最適化・LINE誘導・クーポン表示 |
| AI機能 | GPT-4o-miniで改善提案・今日やること生成 |
| 問い合わせ管理 | LP経由の問い合わせ一覧 |

---

## 将来の拡張予定

- [ ] Google Ads API 連携
- [ ] Meta Marketing API 連携  
- [ ] LINE Messaging API 連携
- [ ] Googleビジネスプロフィール API 連携
- [ ] Stripe 月額課金
- [ ] CSVインポート機能
- [ ] レポートPDF出力
- [ ] グラフ・チャート（recharts）
- [ ] クーポン詳細管理

---

## Vercel へのデプロイ

```bash
# Vercel CLI
npx vercel

# または GitHub連携後、Vercel ダッシュボードから
# 環境変数を設定してデプロイ
```

---

## 注意事項

- `SUPABASE_SERVICE_ROLE_KEY` は絶対に公開しないこと
- 本番環境では Supabase の RLS が有効になっていることを確認
- OpenAI API の利用料金が発生します（GPT-4o-mini は低コスト）
