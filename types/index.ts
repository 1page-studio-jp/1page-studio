// ============================================================
// 1Page Studio — TypeScript 型定義
// ============================================================

export type UserRole = 'admin' | 'owner' | 'staff'
export type StoreStatus = 'active' | 'inactive' | 'trial' | 'canceled'
export type LpStatus = 'draft' | 'published' | 'archived'
export type CouponStatus = 'visible' | 'hidden' | 'expired'
export type Platform = 'google_ads' | 'google_map' | 'facebook' | 'instagram' | 'line' | 'lp' | 'organic' | 'other'
export type DataSource = 'manual' | 'csv' | 'api'
export type InquiryStatus = 'new' | 'contacted' | 'reserved' | 'closed' | 'canceled'
export type SuggestionPriority = 'high' | 'medium' | 'low'
export type SuggestionStatus = 'new' | 'in_progress' | 'completed' | 'ignored'
export type CaseType = 'lp' | 'coupon' | 'ad_copy' | 'line_message' | 'general'
export type MilestoneCategory = 'lp' | 'ads' | 'line' | 'coupon' | 'inquiry' | 'revenue' | 'other'
export type AnalysisSuggestionCategory = 'lp' | 'line' | 'ad' | 'coupon' | 'google' | 'general'
export type ConnectionStatus = 'connected' | 'disconnected' | 'error'

// ============================================================
// PROFILE
// ============================================================
export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

// ============================================================
// STORE
// ============================================================
export interface Store {
  id: string
  owner_id: string
  store_name: string
  industry: string
  industry_label?: string
  postal_code: string | null
  address: string | null
  phone_number: string | null
  email: string | null
  website_url: string | null
  business_hours: string | null
  status: StoreStatus
  slug: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface StoreUser {
  id: string
  user_id: string
  store_id: string
  permission_role: 'owner' | 'manager' | 'viewer'
  created_at: string
}

// ============================================================
// LP PAGES (migration 001 + 007 フィールド)
// ============================================================
export interface LpPage {
  id: string
  store_id: string
  title: string
  status: LpStatus
  deleted_at: string | null
  created_at: string
  updated_at: string

  // 基本コピー
  catch_copy: string | null
  sub_copy: string | null
  cta_text: string | null
  line_cta_text: string | null
  line_benefit: string | null

  // アピールポイント・サービス・特徴
  appeal_points: string[] | null
  services: ServiceItem[] | null
  features: string[] | null

  // デザイン
  primary_color: string | null
  accent_color: string | null

  // SEO / 広告
  seo_title: string | null
  seo_description: string | null
  target_keywords: string[] | null
  ad_headline: string | null
  slug: string | null

  // テンプレート
  template_id: string | null
  last_edited_by: string | null

  // 旧フィールド（互換性維持）
  main_image_url: string | null
  service_description: string | null
  strengths: string[] | null
  pricing: string | null
  testimonials: Testimonial[] | null
  faq: FaqItem[] | null
  access_info: string | null
  business_hours: string | null
  phone_number: string | null
  line_button_url: string | null
  instagram_url: string | null
  google_map_embed: string | null
  coupon_display: boolean
  published_url: string | null
}

export interface ServiceItem {
  name: string
  description: string
  price?: string
  tag?: string
}

export interface Testimonial {
  name: string
  content: string
  rating: number
}

export interface FaqItem {
  question: string
  answer: string
}

// ============================================================
// COUPON
// ============================================================
export interface Coupon {
  id: string
  store_id: string
  coupon_name: string
  discount_description: string
  usage_conditions: string | null
  expiry_date: string | null
  display_status: CouponStatus
  usage_count: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// AD DAILY REPORTS (広告日報)
// ============================================================
export interface AdDailyReport {
  id: string
  store_id: string
  date: string
  platform: Platform
  campaign_name: string | null
  cost: number
  impressions: number
  clicks: number
  lp_views: number
  line_adds: number
  inquiries: number
  reservations: number
  visits: number
  coupon_uses: number
  sales: number
  data_source: DataSource
  created_at: string
  updated_at: string
}

// ============================================================
// INQUIRY (問い合わせ)
// ============================================================
export interface Inquiry {
  id: string
  store_id: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  source: Platform
  message: string | null
  status: InquiryStatus
  created_at: string
  updated_at: string
}

// ============================================================
// IMPROVEMENT SUGGESTIONS (改善提案)
// ============================================================
export interface ImprovementSuggestion {
  id: string
  store_id: string
  suggestion_type: string
  title: string
  description: string
  priority: SuggestionPriority
  status: SuggestionStatus
  created_at: string
  updated_at: string
}

// ============================================================
// AI COMMENTS (月次パートナーコメント)
// ============================================================
export interface AiComment {
  id: string
  store_id: string
  content: string
  todos: string[]
  generated_at: string
  approved: boolean
  approved_by: string | null
  is_manual: boolean
  partner_name: string
  created_at: string
}

// ============================================================
// STORE ANALYSES (AI日次分析)
// ============================================================
export interface AnalysisSuggestion {
  text: string
  category: AnalysisSuggestionCategory
  priority_rank: number
}

export interface StoreAnalysis {
  id: string
  store_id: string
  analysis_date: string
  strengths: string[]
  weaknesses: string[]
  suggestions: AnalysisSuggestion[]
  priorities: string[]
  is_partner_edited: boolean
  partner_note: string | null
  edited_at: string | null
  edited_by: string | null
  ai_model: string
  ai_generated_at: string | null
  created_at: string
}

// ============================================================
// STORE MILESTONES (タイムライン)
// ============================================================
export interface StoreMilestone {
  id: string
  store_id: string
  title: string
  description: string | null
  category: MilestoneCategory
  metric_label: string | null
  metric_value: string | null
  happened_at: string
  is_visible_to_owner: boolean
  created_by: string | null
  created_at: string
}

// ============================================================
// SUCCESS CASES (成功事例)
// ============================================================
export interface SuccessCase {
  id: string
  industry_id: string
  case_type: CaseType
  title: string
  result_summary: string
  result_metric: string | null
  content: string | null
  source_store_id: string | null
  is_featured: boolean
  tags: string[]
  view_count: number
  created_at: string
  updated_at: string
}

// ============================================================
// PARTNER NOTES (パートナーメモ・コメント)
// ============================================================
export interface PartnerNote {
  id: string
  store_id: string
  author_id: string
  content: string
  is_private: boolean
  created_at: string
  updated_at: string
  profiles?: { name: string }
}

// ============================================================
// AD ACCOUNTS (外部連携)
// ============================================================
export interface AdAccount {
  id: string
  store_id: string
  platform: 'google_ads' | 'google_business_profile' | 'meta' | 'line' | 'google_analytics'
  account_name: string | null
  external_account_id: string | null
  connection_status: ConnectionStatus
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// DASHBOARD METRICS (集計)
// ============================================================
export interface DashboardMetrics {
  today: {
    lp_views: number
    line_adds: number
    phone_taps: number
    inquiries: number
    reservations: number
    coupon_uses: number
    sales: number
    cost: number
  }
  this_month: {
    lp_views: number
    line_adds: number
    inquiries: number
    reservations: number
    sales: number
    cost: number
    roas: number
    cpa: number
  }
  score: number
  last_updated: string
}

// ============================================================
// API RESPONSE HELPERS
// ============================================================
export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
