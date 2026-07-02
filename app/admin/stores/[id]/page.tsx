import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ArrowLeft, Store, TrendingUp, Users, MessageSquare,
  Tag, FileText, Settings, Wifi, WifiOff, AlertTriangle,
  CheckCircle, Clock, Sparkles, StickyNote, BarChart3,
  Phone, Mail, MapPin, ExternalLink,
} from 'lucide-react'
import { formatCurrency, formatNumber, calcROAS, calcCPA } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AdminStoreActions } from '@/components/admin/store-actions'
import { AiGenerateButton } from '@/components/admin/ai-generate-button'
import { AiCommentApproval } from '@/components/admin/ai-comment-approval'
import { PartnerNoteForm } from '@/components/admin/partner-note-form'
import { StoreEditForm } from '@/components/admin/store-edit-form'

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: 'Google広告',
  google_business_profile: 'Googleビジネスプロフィール',
  meta_ads: 'Meta広告（Facebook/Instagram）',
  line_official: 'LINE公式アカウント',
  google_analytics: 'Google Analytics',
}

const PLATFORM_ICONS: Record<string, string> = {
  google_ads: '🔵',
  google_business_profile: '🗺️',
  meta_ads: '🔷',
  line_official: '🟢',
  google_analytics: '📊',
}

function ConnectionBadge({ status }: { status: string }) {
  if (status === 'connected') return (
    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle className="h-3 w-3" /> 接続済み
    </span>
  )
  if (status === 'error' || status === 'expired') return (
    <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
      <AlertTriangle className="h-3 w-3" /> エラー
    </span>
  )
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" /> 処理中
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
      <WifiOff className="h-3 w-3" /> 未連携
    </span>
  )
}

export default async function AdminStoreDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')
  const monthLabel = format(today, 'yyyy年M月', { locale: ja })

  const [
    { data: store },
    { data: owner },
    { data: monthReports },
    { data: connections },
    { data: pendingComments },
    { data: suggestions },
    { data: notes },
    { data: recentLogs },
    { data: lps },
    { data: subscription },
    { data: storeUsers },
  ] = await Promise.all([
    supabase.from('stores').select('*').eq('id', params.id).is('deleted_at', null).single(),
    supabase.from('profiles').select('name, email, role').eq('id', (await supabase.from('stores').select('owner_id').eq('id', params.id).single()).data?.owner_id ?? '').single(),
    supabase.from('ad_daily_reports').select('*').eq('store_id', params.id).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('platform_connections').select('*').eq('store_id', params.id),
    supabase.from('ai_comments').select('*').eq('store_id', params.id).eq('approved', false).order('generated_at', { ascending: false }).limit(5),
    supabase.from('improvement_suggestions').select('*').eq('store_id', params.id).in('status', ['new', 'in_progress']).order('priority').limit(10),
    supabase.from('partner_notes').select('*, profiles(name)').eq('store_id', params.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('activity_logs').select('*').eq('store_id', params.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('lp_pages').select('id, title, status').eq('store_id', params.id).is('deleted_at', null),
    supabase.from('subscriptions').select('*').eq('store_id', params.id).single(),
    supabase.from('store_users').select('*, profiles(name, email, role)').eq('store_id', params.id),
  ])

  if (!store) notFound()

  // 今月の集計
  const monthly = (monthReports ?? []).reduce((acc, r) => ({
    cost: acc.cost + Number(r.cost),
    sales: acc.sales + Number(r.sales),
    lp_views: acc.lp_views + r.lp_views,
    line_adds: acc.line_adds + r.line_adds,
    inquiries: acc.inquiries + r.inquiries,
    reservations: acc.reservations + r.reservations,
    coupon_uses: acc.coupon_uses + r.coupon_uses,
  }), { cost: 0, sales: 0, lp_views: 0, line_adds: 0, inquiries: 0, reservations: 0, coupon_uses: 0 })

  const roas = calcROAS(monthly.sales, monthly.cost)
  const cpa = calcCPA(monthly.cost, monthly.inquiries)

  // 全プラットフォームの接続状況を構築
  const ALL_PLATFORMS = ['google_ads', 'google_business_profile', 'meta_ads', 'line_official', 'google_analytics']
  const connectionMap = Object.fromEntries((connections ?? []).map(c => [c.platform, c]))

  const publishedLp = lps?.find(l => l.status === 'published')

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/stores">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{store.store_name}</h1>
              <Badge variant={
                store.status === 'active' ? 'success' :
                store.status === 'trial' ? 'warning' :
                store.status === 'inactive' ? 'secondary' : 'destructive'
              }>
                {store.status === 'active' ? '稼働中' : store.status === 'trial' ? 'トライアル' : store.status === 'inactive' ? '停止中' : '解約'}
              </Badge>
              <Badge variant="outline">{store.industry}</Badge>
              <Badge variant="secondary">{subscription?.plan_name ?? 'trial'}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{store.id}</code>
              · スラグ: <code className="text-xs bg-muted px-1 py-0.5 rounded">{store.slug}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {publishedLp && (
            <Link href={`/lp/${store.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                LP確認
              </Button>
            </Link>
          )}
          <Link href={`/dashboard/${store.id}`} target="_blank">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              ダッシュボード
            </Button>
          </Link>
          <AdminStoreActions storeId={store.id} currentStatus={store.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* 今月KPI */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {monthLabel}の実績
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '広告費', value: formatCurrency(monthly.cost) },
                  { label: '売上', value: formatCurrency(monthly.sales) },
                  { label: 'ROAS', value: `${roas}倍` },
                  { label: 'CPA', value: monthly.inquiries > 0 ? formatCurrency(cpa) : '—' },
                  { label: 'LPアクセス', value: formatNumber(monthly.lp_views) },
                  { label: 'LINE登録', value: formatNumber(monthly.line_adds) },
                  { label: '問い合わせ', value: formatNumber(monthly.inquiries) },
                  { label: 'クーポン利用', value: formatNumber(monthly.coupon_uses) },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* API連携状況 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  外部API連携状況
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {(connections ?? []).filter(c => c.status === 'connected').length}/{ALL_PLATFORMS.length} 接続済み
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {ALL_PLATFORMS.map(platform => {
                const conn = connectionMap[platform]
                return (
                  <div key={platform} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{PLATFORM_ICONS[platform]}</span>
                      <div>
                        <p className="text-sm font-medium">{PLATFORM_LABELS[platform]}</p>
                        {conn?.external_account_name && (
                          <p className="text-xs text-muted-foreground">{conn.external_account_name}</p>
                        )}
                        {conn?.last_synced_at && (
                          <p className="text-xs text-muted-foreground">
                            最終同期: {format(new Date(conn.last_synced_at), 'M/d HH:mm')}
                          </p>
                        )}
                        {conn?.error_message && conn.status === 'error' && (
                          <p className="text-xs text-red-500 mt-0.5">{conn.error_message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConnectionBadge status={conn?.status ?? 'disconnected'} />
                      <span className="text-xs text-muted-foreground">
                        {conn?.status === 'connected' ? '将来: 自動同期' : '将来: OAuth連携'}
                      </span>
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground pt-1">
                ※ API連携機能は順次追加予定。現在は手入力・CSVインポートで運用可能。
              </p>
            </CardContent>
          </Card>

          {/* AIコメント承認 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AIコメント（承認待ち）
                </CardTitle>
                <AiGenerateButton storeId={store.id} />
              </div>
            </CardHeader>
            <CardContent>
              {pendingComments && pendingComments.length > 0 ? (
                <div className="space-y-3">
                  {pendingComments.map(comment => (
                    <AiCommentApproval key={comment.id} comment={comment} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  承認待ちのAIコメントはありません。<br />
                  「AI分析を生成」ボタンで生成してください。
                </p>
              )}
            </CardContent>
          </Card>

          {/* 改善提案 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                改善提案（対応中・未対応）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions && suggestions.length > 0 ? suggestions.map(s => (
                <div key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge
                    variant={s.priority === 'high' ? 'destructive' : s.priority === 'medium' ? 'warning' : 'secondary'}
                    className="shrink-0 mt-0.5"
                  >
                    {s.priority === 'high' ? '重要' : s.priority === 'medium' ? '推奨' : '任意'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {s.status === 'new' ? '未対応' : s.status === 'in_progress' ? '対応中' : s.status}
                  </Badge>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  現在、対応中の改善提案はありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* アクティビティログ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                最近の操作ログ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs && recentLogs.length > 0 ? (
                <div className="space-y-1">
                  {recentLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <span className="text-xs text-muted-foreground w-28 shrink-0">
                        {format(new Date(log.created_at), 'M/d HH:mm')}
                      </span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.action}</code>
                      {log.target_type && (
                        <span className="text-xs text-muted-foreground">{log.target_type}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">操作ログがありません</p>
              )}
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* 店舗情報 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Store className="h-4 w-4" />
                店舗情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {store.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{store.address}</span>
                </div>
              )}
              {store.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{store.phone_number}</span>
                </div>
              )}
              {store.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{store.email}</span>
                </div>
              )}
              <div className="pt-2">
                <StoreEditForm store={store} />
              </div>
            </CardContent>
          </Card>

          {/* オーナー・スタッフ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                ユーザー ({storeUsers?.length ?? 0}名)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {storeUsers?.map(su => (
                <div key={su.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{(su.profiles as any)?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{(su.profiles as any)?.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {su.permission_role === 'owner' ? 'オーナー' : su.permission_role === 'manager' ? '管理者' : '閲覧者'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* LP一覧 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  LP ({lps?.length ?? 0}件)
                </CardTitle>
                <Link href={`/admin/stores/${params.id}/lp`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1">
                    <FileText className="h-3 w-3" />LP編集
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {lps?.map(lp => (
                <div key={lp.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate flex-1">{lp.title || '無題'}</span>
                  <Badge
                    variant={lp.status === 'published' ? 'success' : 'secondary'}
                    className="text-xs shrink-0"
                  >
                    {lp.status === 'published' ? '公開中' : '下書き'}
                  </Badge>
                </div>
              ))}
              {(!lps || lps.length === 0) && (
                <p className="text-sm text-muted-foreground">LPなし</p>
              )}
              <Link href={`/admin/stores/${params.id}/lp`} className="block pt-1">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" />パートナーがLPを編集する
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* サブスクリプション */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">契約プラン</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">プラン</span>
                <Badge variant="secondary">{subscription?.plan_name ?? 'trial'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ステータス</span>
                <Badge variant={subscription?.status === 'active' ? 'success' : 'warning'}>
                  {subscription?.status ?? 'trialing'}
                </Badge>
              </div>
              {subscription?.current_period_end && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">次回更新</span>
                  <span>{format(new Date(subscription.current_period_end), 'yyyy/MM/dd')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">月額</span>
                <span>{formatCurrency(subscription?.price ?? 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* パートナーメモ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                担当者メモ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PartnerNoteForm storeId={store.id} />
              {notes && notes.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  {notes.map(note => (
                    <div key={note.id} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        {(note.profiles as any)?.name} · {format(new Date(note.created_at), 'M/d HH:mm')}
                        {note.is_private && <span className="ml-1 text-orange-600">（非公開）</span>}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
