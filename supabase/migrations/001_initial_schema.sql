-- ============================================================
-- 1Page Studio - Initial Schema
-- マルチテナント対応SaaS データベース設計
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (Supabase auth.users と連携)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('admin', 'owner', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  postal_code TEXT,
  address TEXT,
  phone_number TEXT,
  email TEXT,
  website_url TEXT,
  business_hours TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'inactive', 'trial', 'canceled')),
  slug TEXT UNIQUE NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORE_USERS (オーナーとスタッフの中間テーブル)
-- ============================================================
CREATE TABLE store_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  permission_role TEXT NOT NULL DEFAULT 'viewer' CHECK (permission_role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);

-- ============================================================
-- LP_PAGES
-- ============================================================
CREATE TABLE lp_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  catch_copy TEXT,
  main_image_url TEXT,
  service_description TEXT,
  strengths JSONB DEFAULT '[]',
  pricing TEXT,
  testimonials JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]',
  access_info TEXT,
  business_hours TEXT,
  phone_number TEXT,
  line_button_url TEXT,
  instagram_url TEXT,
  google_map_embed TEXT,
  coupon_display BOOLEAN NOT NULL DEFAULT true,
  published_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  coupon_name TEXT NOT NULL,
  discount_description TEXT NOT NULL,
  usage_conditions TEXT,
  expiry_date DATE,
  display_status TEXT NOT NULL DEFAULT 'visible' CHECK (display_status IN ('visible', 'hidden', 'expired')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AD_ACCOUNTS (将来のAPI連携用)
-- ============================================================
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'google_business_profile', 'meta', 'line', 'google_analytics')),
  account_name TEXT,
  external_account_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  connection_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, platform)
);

-- ============================================================
-- AD_DAILY_REPORTS (広告・集客日別データ)
-- ============================================================
CREATE TABLE ad_daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'google_map', 'facebook', 'instagram', 'line', 'lp', 'organic', 'other')),
  campaign_name TEXT,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  lp_views INTEGER NOT NULL DEFAULT 0,
  line_adds INTEGER NOT NULL DEFAULT 0,
  inquiries INTEGER NOT NULL DEFAULT 0,
  reservations INTEGER NOT NULL DEFAULT 0,
  visits INTEGER NOT NULL DEFAULT 0,
  coupon_uses INTEGER NOT NULL DEFAULT 0,
  sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_source TEXT NOT NULL DEFAULT 'manual' CHECK (data_source IN ('manual', 'csv', 'api')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INQUIRIES (問い合わせ)
-- ============================================================
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  source TEXT NOT NULL DEFAULT 'lp' CHECK (source IN ('lp', 'line', 'google_ads', 'google_map', 'facebook', 'instagram', 'other')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'reserved', 'closed', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- IMPROVEMENT_SUGGESTIONS (改善提案)
-- ============================================================
CREATE TABLE improvement_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI_COMMENTS (AIコメント・今日やること)
-- ============================================================
CREATE TABLE ai_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  todos JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS (課金管理)
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'trial' CHECK (plan_name IN ('trial', 'light', 'standard', 'premium')),
  price INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY_LOGS (操作ログ)
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  store_id UUID REFERENCES stores(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CSV_IMPORTS (CSVインポート履歴)
-- ============================================================
CREATE TABLE csv_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  imported_by_user_id UUID REFERENCES profiles(id),
  file_name TEXT NOT NULL,
  import_type TEXT NOT NULL CHECK (import_type IN ('ad_daily_report', 'sales', 'reservations', 'inquiries')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  row_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_stores_owner_id ON stores(owner_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_store_users_user_id ON store_users(user_id);
CREATE INDEX idx_store_users_store_id ON store_users(store_id);
CREATE INDEX idx_lp_pages_store_id ON lp_pages(store_id);
CREATE INDEX idx_coupons_store_id ON coupons(store_id);
CREATE INDEX idx_ad_daily_reports_store_date ON ad_daily_reports(store_id, date);
CREATE INDEX idx_ad_daily_reports_platform ON ad_daily_reports(store_id, platform, date);
CREATE INDEX idx_inquiries_store_id ON inquiries(store_id);
CREATE INDEX idx_improvement_suggestions_store_id ON improvement_suggestions(store_id);
CREATE INDEX idx_ai_comments_store_id ON ai_comments(store_id);
CREATE INDEX idx_activity_logs_store_id ON activity_logs(store_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON store_users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON lp_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ad_daily_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON improvement_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_imports ENABLE ROW LEVEL SECURITY;

-- Helper: 現在のユーザーのロールを取得
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: ユーザーが店舗にアクセス可能か確認
CREATE OR REPLACE FUNCTION can_access_store(p_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_users
    WHERE user_id = auth.uid() AND store_id = p_store_id
  ) OR get_my_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- STORES
CREATE POLICY "stores_select" ON stores FOR SELECT USING (can_access_store(id) AND deleted_at IS NULL);
CREATE POLICY "stores_insert_admin" ON stores FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "stores_update" ON stores FOR UPDATE USING (can_access_store(id));
CREATE POLICY "stores_delete_admin" ON stores FOR DELETE USING (get_my_role() = 'admin');

-- STORE_USERS
CREATE POLICY "store_users_select" ON store_users FOR SELECT USING (user_id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "store_users_insert_admin" ON store_users FOR INSERT WITH CHECK (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM store_users su WHERE su.store_id = store_id AND su.user_id = auth.uid() AND su.permission_role = 'owner'));
CREATE POLICY "store_users_delete" ON store_users FOR DELETE USING (get_my_role() = 'admin');

-- LP_PAGES
CREATE POLICY "lp_pages_select" ON lp_pages FOR SELECT USING (can_access_store(store_id) AND deleted_at IS NULL);
CREATE POLICY "lp_pages_insert" ON lp_pages FOR INSERT WITH CHECK (can_access_store(store_id));
CREATE POLICY "lp_pages_update" ON lp_pages FOR UPDATE USING (can_access_store(store_id));
CREATE POLICY "lp_pages_delete" ON lp_pages FOR DELETE USING (can_access_store(store_id));

-- COUPONS
CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (can_access_store(store_id) AND deleted_at IS NULL);
CREATE POLICY "coupons_insert" ON coupons FOR INSERT WITH CHECK (can_access_store(store_id));
CREATE POLICY "coupons_update" ON coupons FOR UPDATE USING (can_access_store(store_id));

-- AD_ACCOUNTS
CREATE POLICY "ad_accounts_select" ON ad_accounts FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "ad_accounts_insert" ON ad_accounts FOR INSERT WITH CHECK (can_access_store(store_id));
CREATE POLICY "ad_accounts_update" ON ad_accounts FOR UPDATE USING (can_access_store(store_id));

-- AD_DAILY_REPORTS
CREATE POLICY "ad_daily_reports_select" ON ad_daily_reports FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "ad_daily_reports_insert" ON ad_daily_reports FOR INSERT WITH CHECK (can_access_store(store_id));
CREATE POLICY "ad_daily_reports_update" ON ad_daily_reports FOR UPDATE USING (can_access_store(store_id));

-- INQUIRIES
CREATE POLICY "inquiries_select" ON inquiries FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "inquiries_insert" ON inquiries FOR INSERT WITH CHECK (true); -- LP公開フォームからの投稿を許可
CREATE POLICY "inquiries_update" ON inquiries FOR UPDATE USING (can_access_store(store_id));

-- IMPROVEMENT_SUGGESTIONS
CREATE POLICY "suggestions_select" ON improvement_suggestions FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "suggestions_insert" ON improvement_suggestions FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "suggestions_update" ON improvement_suggestions FOR UPDATE USING (can_access_store(store_id));

-- AI_COMMENTS
CREATE POLICY "ai_comments_select" ON ai_comments FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "ai_comments_insert" ON ai_comments FOR INSERT WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "ai_comments_update" ON ai_comments FOR UPDATE USING (get_my_role() = 'admin');

-- SUBSCRIPTIONS
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "subscriptions_admin_all" ON subscriptions FOR ALL USING (get_my_role() = 'admin');

-- ACTIVITY_LOGS
CREATE POLICY "activity_logs_select_admin" ON activity_logs FOR SELECT USING (get_my_role() = 'admin' OR store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT WITH CHECK (true);

-- CSV_IMPORTS
CREATE POLICY "csv_imports_select" ON csv_imports FOR SELECT USING (can_access_store(store_id));
CREATE POLICY "csv_imports_insert" ON csv_imports FOR INSERT WITH CHECK (can_access_store(store_id));

-- ============================================================
-- AUTH TRIGGER: 新規ユーザー登録時にprofileを自動作成
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- LP公開用のPublic Policy（認証不要で閲覧可能）
-- ============================================================
CREATE POLICY "lp_pages_public_select" ON lp_pages
  FOR SELECT USING (status = 'published');

CREATE POLICY "stores_public_select" ON stores
  FOR SELECT USING (status IN ('active', 'trial') AND deleted_at IS NULL);

CREATE POLICY "coupons_public_select" ON coupons
  FOR SELECT USING (display_status = 'visible' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE));
