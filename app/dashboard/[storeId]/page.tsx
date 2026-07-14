import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AiCommentBox } from '@/components/dashboard/ai-comment-box'
import Link from 'next/link'
import {
  CalendarCheck, MessageSquare, UserPlus, TrendingUp,
  ArrowRight, Bell, ExternalLink,
  CheckCircle2, TrendingDown, Tag, FileText, Wifi,
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

function getGreeting(h: number) {
  if (h < 10) return 'おはようございます'
  if (h < 17) return 'こんにちは'
  return 'こんばんは'
}

function GrowthBadge({ value, unit = '' }: { value: number; unit?: string }) {
  const positive = value > 0
  const sign = value > 0 ? '+' : ''
  if (value === 0) return <span className="text-[11px] font-semibold text-gray-300">±0{unit}</span>
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
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

  const todaySum = (todayReports ?? []).reduce((a, r) => ({
    reservations: a.reservations + (r.reservations || 0),
    inquiries: a.inquiries + (r.inquiries || 0),
    line_adds: a.line_adds + (r.line_adds || 0),
    revenue: a.revenue + Number(r.revenue || r.sales || 0),
  }), { reservations: 0, inquiries: 0, line_adds: 0, revenue: 0 })

  const monthSum = (monthReports ?? []).reduce((a, r) => ({
    spend: a.spend + Number(r.spend || r.cost || 0),
    revenue: a.revenue + Number(r.revenue || r.sales || 0),
    line_adds: a.line_adds + (r.line_adds || 0),
    inquiries: a.inquiries + (r.inquiries || 0),
    reservations: a.reservations + (r.reservations || 0),
  }), { spend: 0, revenue: 0, line_adds: 0, inquiries: 0, reservations: 0 })

  const prevSum = (prevMonthReports ?? []).reduce((a, r) => ({
    revenue: a.revenue + Number(r.revenue || r.sales || 0),
    line_adds: a.line_adds + (r.line_adds || 0),
    inquiries: a.inquiries + (r.inquiries || 0),
    reservations: a.reservations + (r.reservations || 0),
  }), { revenue: 0, line_adds: 0, inquiries: 0, reservations: 0 })

  const growthLine = prevSum.line_adds > 0 ? Math.round(((monthSum.line_adds - prevSum.line_adds) / prevSum.line_adds) * 100) : 0
  const growthInquiry = monthSum.inquiries - prevSum.inquiries
  const growthRevenue = prevSum.revenue > 0 ? Math.round(((monthSum.revenue - prevSum.revenue) / prevSum.revenue) * 100) : 0
  const growthReservation = monthSum.reservations - prevSum.reservations

  const hasAds = monthSum.spend > 0
  const roas = hasAds && monthSum.revenue > 0 ? monthSum.revenue / monthSum.spend : 0

  const connectedPlatforms = (connections ?? []).map(c => c.platform)
  const resolvedInquiryCount = inquiryCountRaw ?? newInquiries?.length ?? 0
  const dayLabel = format(today, 'M月d日（E）', { locale: ja })
  const monthLabel = format(today, 'M月', { locale: ja })

  // ── Todo: 全て統合。セットアップ未完了 + 日次タスク
  type Todo = {
    label: string
    done: boolean
    href: string
    actionLabel: string
    urgent?: boolean
    icon: React.ElementType
  }

  const todos: Todo[] = [
    // 🔴 緊急：未対応問い合わせ
    ...(resolvedInquiryCount > 0 ? [{
      label: `お問い合わせに返信する（${resolvedInquiryCount}件）`,
      done: false,
      href: `/dashboard/${params.storeId}/inquiries`,
      actionLabel: '今すぐ返信',
      urgent: true,
      icon: MessageSquare,
    }] : []),
    // セットアップ未完了
    ...(!lp ? [{
      label: 'LPを作成する（未作成）',
      done: false,
      href: `/dashboard/${params.storeId}/lp`,
      actionLabel: '作成する',
      urgent: false,
      icon: FileText,
    }] : []),
    ...(lp && !lp.line_button_url ? [{
      label: 'LINEボタンをLPに追加する',
      done: false,
      href: `/dashboard/${params.storeId}/lp`,
      actionLabel: '設定する',
      urgent: false,
      icon: Wifi,
    }] : []),
    // 日次タスク
    {
      label: (activeCoupons?.length ?? 0) > 0
        ? `クーポンを確認する（${activeCoupons?.length ?? 0}件公開中）`
        : 'クーポンを作成する',
      done: (activeCoupons?.length ?? 0) > 0,
      href: `/dashboard/${params.storeId}/coupons`,
      actionLabel: (activeCoupons?.length ?? 0) > 0 ? '確認する' : '作成する',
      urgent: false,
      icon: Tag,
    },
    {
      label: 'Google口コミに返信する',
      done: false,
      href: 'https://business.google.com/',
      actionLabel: '返信する',
      urgent: false,
      icon: MessageSquare,
    },
    // 問い合わせ確認（0件の場合）
    ...(resolvedInquiryCount === 0 ? [{
      label: 'お問い合わせを確認する（対応済み）',
      done: true,
      href: `/dashboard/${params.storeId}/inquiries`,
      actionLabel: '確認する',
      urgent: false,
      icon: MessageSquare,
    }] : []),
  ]

  const todoDone = todos.filter(t => t.done).length
  const todoPercent = todos.length > 0 ? Math.round((todoDone / todos.length) * 100) : 0

  return (
    <div className="min-h-full bg-gray-50/60">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-5 pb-28 md:pb-10">

        {/* ══ ① ヘッダー ══ */}
        <div className="flex items-start justify-between gap-4 pt-1">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-500 mb-2">
              <CalendarCheck className="h-3 w-3" />
              {dayLabel}
            </div>
            <h1 className="text-[26px] md:text-[30px] font-black tracking-tight text-gray-900 leading-tight">
              {getGreeting(h)}、
            </h1>
            <p className="text-[20px] font-bold text-indigo-600 mt-0.5 leading-tight">
              {store?.store_name}
            </p>
          </div>
          {lp && (
            <Link
              href={`/lp/${lp.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all whitespace-nowrap mt-2 shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
              LPを確認
            </Link>
          )}
        </div>

        {/* ══ ② 今日やること（アクションボタン統合）══ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-gray-900">今日やること</h2>
              <span className="text-xs font-semibold text-gray-400">{todoDone}/{todos.length} 完了</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-indigo-500"
                style={{ width: `${todoPercent}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {todos.map((todo, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${todo.done ? 'opacity-45' : ''}`}>
                {/* ステータスアイコン */}
                {todo.done
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  : (
                    <div className={`h-5 w-5 shrink-0 rounded-full border-2 ${todo.urgent ? 'border-orange-300 bg-orange-50' : 'border-indigo-200 bg-indigo-50/60'}`} />
                  )
                }

                {/* ラベル */}
                <span className={`text-sm flex-1 min-w-0 ${todo.done ? 'line-through text-gray-400' : todo.urgent ? 'text-gray-900 font-bold' : 'text-gray-800 font-medium'}`}>
                  {todo.label}
                </span>

                {/* アクションボタン */}
                {!todo.done && (
                  <Link
                    href={todo.href}
                    target={todo.href.startsWith('http') ? '_blank' : undefined}
                    className={`shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                      todo.urgent
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {todo.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ══ ③ 今日の数字 ══ */}
        <div>
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-0.5">今日の数字</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '予約', value: formatNumber(todaySum.reservations), icon: CalendarCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'お問い合わせ', value: formatNumber(todaySum.inquiries), icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-50' },
              { label: 'LINE登録', value: formatNumber(todaySum.line_adds), icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: '売上', value: todaySum.revenue > 0 ? formatCurrency(todaySum.revenue) : '—', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${bg} mb-3`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-[24px] font-black text-gray-900 leading-none tracking-tight">{value}</p>
                <p className="text-[11px] text-gray-400 mt-1.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ ④ 担当パートナーからのアドバイス ══ */}
        {latestComment && (
          <div>
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-0.5">担当パートナーからのアドバイス</h2>
            <AiCommentBox
              comment={latestComment.content}
              todos={latestComment.todos ?? []}
              generatedAt={format(new Date(latestComment.generated_at), 'M月d日 HH:mm', { locale: ja })}
            />
          </div>
        )}

        {/* ══ ⑤ 今月の成果 ══ */}
        <div>
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-0.5">今月の成果</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* 広告ROASヘッダー */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50/80 to-white border-b border-gray-50">
              <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide mb-1.5">{monthLabel}の広告効果</p>
              {monthSum.spend > 0 ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm text-gray-400">{formatCurrency(monthSum.spend)} 使って</span>
                  <span className={`text-[22px] font-black leading-none ${roas >= 2 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {formatCurrency(monthSum.revenue)}
                  </span>
                  <span className="text-sm text-gray-400">の売上</span>
                  {hasAds && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${roas >= 2 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      ROAS {roas.toFixed(1)}x
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  データ未入力 —{' '}
                  <Link href={`/dashboard/${params.storeId}/reports`} className="text-indigo-500 hover:underline font-semibold">
                    入力する →
                  </Link>
                </p>
              )}
            </div>

            {/* 月次指標 2x2 */}
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-50">
              {[
                { label: 'LINE登録', value: formatNumber(monthSum.line_adds), growth: growthLine, unit: '%' },
                { label: 'お問い合わせ', value: `${monthSum.inquiries}件`, growth: growthInquiry, unit: '件' },
                { label: '売上', value: monthSum.revenue > 0 ? formatCurrency(monthSum.revenue) : '—', growth: growthRevenue, unit: '%' },
                { label: '予約', value: `${monthSum.reservations}件`, growth: growthReservation, unit: '件' },
              ].map((item) => (
                <div key={item.label} className="px-5 py-4">
                  <p className="text-[11px] text-gray-400 font-medium mb-1.5">{item.label}</p>
                  <p className="text-[20px] font-black text-gray-900 leading-none">{item.value}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-300 font-medium">先月比</span>
                    <GrowthBadge value={item.growth} unit={item.unit} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
