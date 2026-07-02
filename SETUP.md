# 1Page Studio — セットアップガイド

このガイドを順番に進めれば、知識ゼロからでも本番環境を立ち上げられます。

---

## 必要なもの

| ツール | 料金 | 用途 |
|--------|------|------|
| [Supabase](https://supabase.com) | 無料プランあり | データベース・認証 |
| [Vercel](https://vercel.com) | 無料プランあり | ホスティング・デプロイ |
| [OpenAI](https://platform.openai.com) | 従量課金 | AI分析（月数百円〜） |
| [GitHub](https://github.com) | 無料 | コードのホスティング |
| Node.js 18以上 | 無料 | ローカル開発 |

---

## STEP 1 — GitHubにコードをアップロード

1. [github.com/new](https://github.com/new) でリポジトリを新規作成
2. リポジトリ名：`1page-studio`（非公開にする）
3. ローカルで以下を実行：

```bash
cd 1page-studio
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/1page-studio.git
git push -u origin main
```

---

## STEP 2 — Supabaseプロジェクト作成

1. [supabase.com](https://supabase.com) にサインアップ
2. 「New Project」をクリック
3. 設定：
   - **Project name**: `1page-studio`
   - **Database Password**: 強力なパスワードを設定（必ず控える）
   - **Region**: `Northeast Asia (Tokyo)` を選択
4. プロジェクト作成まで約1分待つ

---

## STEP 3 — データベースをセットアップ

Supabase ダッシュボード > **SQL Editor** を開いて、以下のファイルを**順番に**貼り付けて実行：

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_api_connections.sql`
3. `supabase/migrations/003_store_milestones.sql`
4. `supabase/migrations/004_ai_comments_partner.sql`
5. `supabase/migrations/005_store_analyses.sql`
6. `supabase/migrations/006_success_cases.sql`
7. `supabase/migrations/007_lp_template_fields.sql`
8. `supabase/migrations/008_partner_notes.sql`

各ファイルをコピー → SQL Editor に貼り付け → 「Run」ボタンを押す。  
エラーが出なければ次に進む。

---

## STEP 4 — APIキーを確認

Supabase ダッシュボード > **Settings** > **API** を開く。

以下の値を控える：
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` キー → `SUPABASE_SERVICE_ROLE_KEY`（非公開！）

---

## STEP 5 — OpenAI APIキーを取得

1. [platform.openai.com](https://platform.openai.com) にサインアップ
2. 右上のアカウントアイコン > **API Keys** > **Create new secret key**
3. キーをコピーして控える（一度しか表示されない）

> 💡 GPT-4o-miniを使っているので、月1,000回のAI分析生成でも数百円程度です。

---

## STEP 6 — ローカルで動作確認

プロジェクトのルートに `.env.local` ファイルを作成：

```bash
cp .env.example .env.local
```

`.env.local` を編集して値を入力：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsIn...
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

依存パッケージをインストールして起動：

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いて確認。

---

## STEP 7 — 管理者アカウントを作成

1. Supabase ダッシュボード > **Authentication** > **Users** > **Invite user**
2. あなたのメールアドレスを入力 → 招待メールが届く
3. メール内のリンクでパスワードを設定
4. Supabase SQL Editor で以下を実行（メールアドレスを変更）：

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

5. `http://localhost:3000/login` でログイン
6. 管理者ダッシュボード `/admin` に遷移すれば成功

---

## STEP 8 — Vercelにデプロイ

### 8-1. Vercelにサインアップ
[vercel.com](https://vercel.com) → **Sign up with GitHub**

### 8-2. プロジェクトをインポート
1. Vercel ダッシュボード > **New Project**
2. 先ほど作成したGitHubリポジトリ（`1page-studio`）を選択
3. **Import** をクリック

### 8-3. 環境変数を設定
「Environment Variables」セクションに、`.env.local` と同じ値を入力：

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGci... |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGci... |
| `OPENAI_API_KEY` | sk-proj-... |
| `NEXT_PUBLIC_APP_URL` | https://your-domain.vercel.app |

### 8-4. デプロイ
「Deploy」ボタンを押すと自動でビルドが始まる。  
完了するとURLが発行される（例：`https://1page-studio.vercel.app`）。

---

## STEP 9 — 独自ドメインの設定（任意）

`1page.studio` などの独自ドメインを使う場合：

1. Vercel > プロジェクト > **Settings** > **Domains**
2. ドメインを追加
3. ドメインレジストラ側でDNS設定を変更（Vercelが手順を表示）
4. Supabase > **Authentication** > **URL Configuration** で以下を更新：
   - **Site URL**: `https://your-domain.com`
   - **Redirect URLs**: `https://your-domain.com/**`

---

## STEP 10 — 最初の店舗を登録

1. `/admin` にログイン
2. 「新規店舗登録」をクリック
3. 業種を選択 → LPが自動生成される
4. 「LP編集」でキャッチコピー・画像・サービスを編集
5. 「公開する」で LP が `https://your-domain.com/lp/your-slug` に公開される

---

## よくある問題

### ログインできない
→ Supabase > Authentication > Users にユーザーが存在するか確認  
→ `UPDATE profiles SET role = 'admin'...` を実行したか確認

### LP が表示されない
→ LP のステータスが「公開中（published）」になっているか確認  
→ `stores` テーブルの `status` が `active` または `trial` か確認

### AI分析が動かない
→ `.env.local` の `OPENAI_API_KEY` が正しいか確認  
→ OpenAI のクレジットが残っているか確認（[platform.openai.com/usage](https://platform.openai.com/usage)）

### Vercel デプロイでビルドエラー
→ Vercel > プロジェクト > **Deployments** でエラーログを確認  
→ 環境変数が全て設定されているか確認

---

## ディレクトリ構成

```
1page-studio/
├── app/
│   ├── admin/          # パートナー管理画面
│   ├── dashboard/      # オーナーダッシュボード
│   ├── lp/[slug]/      # 公開LPページ
│   ├── login/          # ログイン
│   └── api/            # APIルート
├── components/
│   ├── admin/          # 管理画面コンポーネント
│   ├── dashboard/      # ダッシュボードコンポーネント
│   ├── layout/         # 共通レイアウト
│   └── ui/             # 基本UIパーツ
├── lib/
│   ├── supabase/       # Supabaseクライアント
│   ├── lp-templates.ts # 業種別LPテンプレート
│   ├── openai.ts       # OpenAI設定
│   └── utils.ts        # ユーティリティ
├── supabase/migrations/ # DBマイグレーション（001〜009）
├── types/index.ts       # 全TypeScript型定義
├── middleware.ts         # 認証・ルーティング
├── .env.example         # 環境変数テンプレート
└── SETUP.md             # このガイド
```

---

## サポート

セットアップで詰まった場合は、以下を送ってください：
- エラーメッセージのスクリーンショット
- どのSTEPで止まったか

一緒に解決します！
