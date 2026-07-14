import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/dashboard/metric-card'
import { ScoreCard, type ScoreItem } from '@/components/dashboard/score-card'
import { AiCommentBox } from '@/components/dashboard/ai-comment-box'
import Link from 'next/link'
import {
  CalendarCheck, MessageSquare, UserPlus, TrendingUp,
  FileText, Tag, ArrowRight, Bell, ExternalLink,
  CheckCircle2, Circle, TrendingDown,
} from 'lucide-react'
import { formatCurrency, formatNumber, calcScore } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

function getGreeting(h: number) {
  if (h < 10) return 'おはようございます'
  if (h < 17) return 'こんにちは'
  return 'こんばんは'
}

// 先月比の表示ヘルパー
function GrowthBadge({ value, unit = '', inverse = false }: { value: number; unit?: string; inverse?: boolean }) {
  const positive = inverse ? value < 0 : value > 0
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? 'text-emerald-600' : value < 0 ? 'text-red-500' : 'text-gray-400'}`}>
      {value > 0 ? <TrendingUp className="h-3 w-3" /> : value < 0 ? <TrendingDown className="h-3 w-3" /> : null}
      {sign}{value}{unit}
    </span>
  )
}

export default async function StoreDashboard({ params }: { params: { storeId: string } }) {
  const supabase = createClient()
  const today = new Date()
  const h = today.getHours()
  const todayStr = format(today, 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')
  const prevMonthStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')
  const prevMonthEnd = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')

  const [
    { data: store },
    { data: todayReports },
    { data: monthReports },
    { data: prevMonthReports },
    { data: latestComment },
    { data: newInquiries, count: inquiryCountRaw },
    { data: lp },
    { data: activeCoupons },
    { data: connections },
  ] = await Promise.all([
    supabase.from('stores').select('*').eq('id', params.storeId).single(),
    supabase.from('ad_daily_reports').select('*').eq('store_id', params.storeId).eq('date', todayStr),
    supabase.from('ad_daily_reports').select('*').eq('store_id', params.storeId).gte('date', monthStart).lte('date', monthEnd),
    supabase.from('ad_daily_reports').select('*').eq('store_id', params.storeId).gte('date', prevMonthStart).lte('date', prevMonthEnd),
    supabase.from('ai_comments').select('*').eq('store_id', params.storeId).eq('approved', true).order('generated_at', { ascending: false }).limit(1).single(),
    supabase.from('inquiries').select('id, customer_name, created_at', { count: 'exact' }).eq('store_id', params.storeId).eq('status', 'new').order('created_at', { ascending: false }).limit(5),
    supabase.from('lp_pages').select('id, slug, title, status, catch_copy, line_button_url').eq('store_id', params.storeId).eq('status', 'published').limit(1).single(),
    supabase.from('coupons').select('id').eq('store_id', params.storeId).eq('display_status', 'visible').is('deleted_at', null),
    supabase.from('platform_connections').select('platform').eq('store_id', params.storeId).eq('is_active', true),
  ])

  if (!store) notFound()

  // ── 今日の集計 ────────────────────────────────────────────
  const todaySum = (todayReports ?? []).reduce((a, r) => ({
    reservations: a.reservations + (r.reservations || 0),
    inquiries: a.inquiries + (r.inquiries || 0),
    line_adds: a.line_adds + (r.line_adds || 0),
    revenue: a.revenue + Number(r.revenue || r.sales || 0),
    lp_views: a.lp_views + (r.lp_views || 0),
  }), { reservations: 0, inquiries: 0, line_adds: 0, revenue: 0, lp_views: 0 })

  // ── 今月の集計 ────────────────────────────────────────────
  const monthSum = (monthReports ?? []).reduce((a, r) => ({
    spend: a.spend + Number(r.spend || r.cost || 0),
    revenue: a.revenue + Number(r.revenue || r.sales || 0),
    line_adds: a.line_adds + (r.line_adds || 0),
    inquiries: a.inquiries + (r.inquiries || 0),
    reservations: a.reservations + (r.reservations || 0),
    lp_views: a.lp_views + (r.lp_views || 0),
    coupon_uses: a.coupon_uses + (r.coupon_uses || 0),
  }), { spend: 0, revenue: 0, line_adds: 0, inquiries: 0, reservations: 0, lp_views: 0, coupon_uses: 0 })

  // ── 先月の集計 ────────────────────────────────────────────
  const prevSum = (prevMonthReports ?? []).reduce((a, r) => ({
    revenue: a.revenue + Number(r.revenue || r.sales || 0),
    line_adds: a.line_adds + (r.line_adds || 0),
    inquiries: a.inquiries + (r.inquiries || 0),
    reservations: a.reservations + (r.reservations || 0),
  }), { revenue: 0, line_adds: 0, inquiries: 0, reservations: 0 })

  // 先月比
  const growthLine = prevSum.line_adds > 0 ? Math.round(((monthSum.line_adds - prevSum.line_adds) / prevSum.line_adds) * 100) : 0
  const growthInquiry = monthSum.inquiries - prevSum.inquiries
  const growthRevenue = prevSum.revenue > 0 ? Math.round(((monthSum.revenue - prevSum.revenue) / prevSum.revenue) * 100) : 0
  const growthReservation = monthSum.reservations - prevSum.reservations

  // ── スコア計算 ─────────────────────────────────────────────
  const lineAddRate = monthSum.lp_views > 0 ? (monthSum.line_adds / monthSum.lp_views) * 100 : 0
  const hasAds = monthSum.spend > 0
  const roas = hasAds && monthSum.revenue > 0 ? monthSum.revenue / monthSum.spend : 0
  const score = calcScore({
    lineAddRate,
    inquiryRate: monthSum.lp_views > 0 ? (monthSum.inquiries / monthSum.lp_views) * 100 : 0,
    reservationRate: monthSum.lp_views > 0 ? (monthSum.reservations / monthSum.lp_views) * 100 : 0,
    couponUseRate: monthSum.lp_views > 0 ? (monthSum.coupon_uses / monthSum.lp_views) * 100 : 0,
    roas,
  })

  const connectedPlatforms = (connections ?? []).map(c => c.platform)
  const scoreItems: ScoreItem[] = [
    { label: 'LP完成度',       done: !!lp?.catch_copy,                              partial: !!lp && !lp.catch_copy, note: lp?.catch_copy ? '設定済み' : '未設定' },
    { label: 'Google設定',     done: connectedPlatforms.includes('google'),          note: connectedPlatforms.includes('google') ? '連携済み' : '未設定' },
    { label: 'LINE設定',       done: !!lp?.line_button_url,                          note: lp?.line_button_url ? '設定済み' : '未設定' },
    { label: '広告設定',       done: hasAds,                                         note: hasAds ? '運用中' : '未設定' },
    { label: 'クーポン設定',   done: (activeCoupons?.length ?? 0) > 0,               note: (activeCoupons?.length ?? 0) > 0 ? '公開中' : '未設定' },
    { label: 'Google口コミ返信率', done: false, partial: true,                       note: '確認中' },
  ]

  const resolvedInquiryCount = inquiryCountRaw ?? newInquiries?.length ?? 0
  const dayLabel = format(today, 'M月d日（E）', { locale: ja })
  const monthLabel = format(today, 'M月', { locale: ja })

  // ── 今日やること（動的生成） ───────────────────────────────
  const todos: { label: string; done: boolean; href: string }[] = [
    {
      label: resolvedInquiryCount > 0 ? `お問い合わせに返信する（${resolvedInquiryCount}件）` : 'お問い合わせを確認する',
      done: resolvedInquiryCount === 0,
      href: `/dashboard/${params.storeId}/inquiries`,
    },
    {
      label: lp ? 'LPの内容を確認する' : 'LPを作成する',
      done: !!lp?.catch_copy,
      href: `/dashboard/${params.storeId}/lp`,
    },
    {
      label: (activeCoupons?.length ?? 0) > 0 ? 'クーポンを確認・更新する' : 'クーポンを作成する',
      done: (activeCoupons?.length ?? 0) > 0,
      href: `/dashboard/${params.storeId}/coupons`,
    },
    {
      label: 'Google口コミに返信する',
      done: false,
      href: 'https://business.google.com/',
    },
  ]
  const todoDone = todos.filter(t => t.done).length

  return (
    <div className="min-h-full bg-[#FAFAFA]">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-8 pb-28 md:pb-10">

        {/* ══ ① ヘッダー ══════════════════════════════════════ */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-gray-400 font-medium">{dayLabel}</p>
            <h1 className="text-[28px] font-black tracking-tight mt-0.5 text-gray-900">
              {getGreeting(h)}
            </h1>
            <p className="text-[15px] text-gray-500 mt-0.5">{store?.store_name}</p>
          </div>
          {lp && store && (
            <Link
              href={`/lp/${lp.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all whitespace-nowrap mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              LPを見る
            </Link>
          )}
        </div>

        {/* ══ 未対応アラート ══════════════════════════════════ */}
        {resolvedInquiryCount > 0 && (
          <Link href={`/dashboard/${params.storeId}/inquiries`}>
            <div className="flex items-center gap-3 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3.5 hover:bg-orange-100/80 transition-colors cursor-pointer">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100">
                <Bell className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-800">
                  未対応のお問い合わせが {resolvedInquiryCount}件
                </p>
                <p className="text-xs text-orange-500 mt-0.5">
                  {newInquiries?.[0]?.customer_name ?? '匿名'}さん が待っています
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-orange-300 shrink-0" />
            </div>
          </Link>
        )}

        {/* ══ ② 今日やること ══════════════════════════════════ */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest">今日やること</h2>
            <span className="text-xs text-gray-400">{todoDone}/{todos.length} 完了</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-sm">
            {todos.map((todo, i) => (
              <Link key={i} href={todo.href}>
                <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  {todo.done
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    : <Circle className="h-5 w-5 shrink-0 text-gray-200" />
                  }
                  <span className={`text-sm flex-1 ${todo.done ? 'line-through text-gray-300' : 'text-gray-800 font-medium'}`}>
                    {todo.label}
                  </span>
                  {!todo.done && <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ══ ③ 今日の数字（4指標） ══════════════════════════ */}
        <div>
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-3">今日の数字</h2>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="今日の予約"
              value={formatNumber(todaySum.reservations)}
              icon={CalendarCheck}
              iconColor="text-blue-500"
              iconBg="bg-blue-50"
            />
            <MetricCard
              label="今日のお問い合わせ"
              value={formatNumber(todaySum.inquiries)}
              icon={MessageSquare}
              iconColor="text-violet-500"
              iconBg="bg-violet-50"
            />
            <MetricCard
              label="今日のLINE登録"
              value={formatNumber(todaySum.line_adds)}
              icon={UserPlus}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-50"
            />
            <MetricCard
              label="今日の売上"
              value={todaySum.revenue > 0 ? formatCurrency(todaySum.revenue) : '—'}
              icon={TrendingUp}
              iconColor="text-amber-500"
              iconBg="bg-amber-50"
            />
          </div>
        </div>

        {/* ══ ④ 担当パートナーからのアドバイス ═══════════════ */}
        {latestComment && (
          <div>
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-3">担当パートナーからのアドバイス</h2>
            <AiCommentBox
              comment={latestComment.content}
              todos={latestComment.todos ?? []}
              generatedAt={format(new Date(latestComment.generated_at), 'M月d日 HH:mm', { locale: ja })}
            />
          </div>
        )}

        {/* ══ ⑤ お店の成長スコア ════════════════════════════ */}
        <div>
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-3">お店の成長スコア</h2>
          <ScoreCard score={score} items={scoreItems} month={monthLabel} />
        </div>

        {/* ══ ⑥ 今月の成果（先月比） ═════════════════════════ */}
        <div>
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-3">今月の成果</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {/* 月次サマリ */}
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs text-gray-400 mb-1">{monthLabel}の広告効果</p>
              {monthSum.spend > 0 ? (
                <p className="text-base font-bold text-gray-900">
                  {formatCurrency(monthSum.spend)} 使って{' '}
                  <span className={roas >= 2 ? 'text-emerald-600' : 'text-amber-600'}>
                    {formatCurrency(monthSum.revenue)}
                  </span>{' '}の売上
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  データ未入力 —{' '}
                  <Link href={`/dashboard/${params.storeId}/reports`} className="text-blue-500 hover:underline">
                    入力する
                  </Link>
                </p>
              )}
            </div>

            {/* 先月比グリッド */}
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-50">
              {[
                { label: 'LINE登録', value: formatNumber(monthSum.line_adds), growth: growthLine, unit: '%' },
                { label: 'お問い合わせ', value: `${monthSum.inquiries}件`, growth: growthInquiry, unit: '件' },
                { label: '売上', value: monthSum.revenue > 0 ? formatCurrency(monthSum.revenue) : '—', growth: growthRevenue, unit: '%' },
                { label: '予約', value: `${monthSum.reservations}件`, growth: growthReservation, unit: '件' },
              ].map((item) => (
                <div key={item.label} className="px-5 py-4">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">先月比</span>
                    <GrowthBadge value={item.growth} unit={item.unit} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ クイックアクション ══════════════════════════════ */}
        <div>
          <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-3">よく使う機能</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: `/dashboard/${params.storeId}/lp`, icon: FileText, label: 'LP を編集', color: 'text-blue-500', bg: 'bg-blue-50' },
              { href: `/dashboard/${params.storeId}/coupons`, icon: Tag, label: (activeCoupons?.length ?? 0) > 0 ? 'クーポンを管理する' : 'クーポンを作る', color: 'text-amber-500', bg: 'bg-amber-50' },
              { href: `/dashboard/${params.storeId}/inquiries`, icon: MessageSquare, label: '問い合わせを見る', color: 'text-violet-500', bg: 'bg-violet-50' },
              { href: `/dashboard/${params.storeId}/reports`, icon: TrendingUp, label: '数字を確認する', color: 'text-emerald-500', bg: 'bg-emerald-50' },
            ].map(({ href, icon: Icon, label, color, bg }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-4 hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className={`h-[18px] w-[18px] ${color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 ml-auto shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
