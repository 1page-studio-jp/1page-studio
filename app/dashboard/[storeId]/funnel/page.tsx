import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { FunnelChart, buildFunnelData } from '@/components/dashboard/funnel-chart'
import { Activity } from 'lucide-react'

interface Props {
  params: { storeId: string }
  searchParams: { month?: string } // YYYY-MM
}

export default async function FunnelPage({ params, searchParams }: Props) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('id', params.storeId)
    .single()

  if (!store) notFound()

  // Determine target month
  const today = new Date()
  const targetMonth = searchParams.month ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [yearStr, monthStr] = targetMonth.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const monthStart = `${targetMonth}-01`
  const nextMonthDate = new Date(year, month, 1)
  const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  // ① 広告クリック + LP閲覧 (from ad_daily_reports)
  const { data: adReports } = await supabase
    .from('ad_daily_reports')
    .select('clicks, lp_views, line_adds, conversions')
    .eq('store_id', params.storeId)
    .gte('date', monthStart)
    .lt('date', monthEnd)

  const adClicks = (adReports || []).reduce((s, r) => s + (r.clicks || 0), 0)
  const lpViews = (adReports || []).reduce((s, r) => s + (r.lp_views || 0), 0)
  const lineAddsFromAd = (adReports || []).reduce((s, r) => s + (r.line_adds || 0), 0)

  // ② LINE登録 — also count from direct LP visits (prefer ad_daily_reports sum)
  const lineAdds = lineAddsFromAd

  // ③ クーポン取得 — count coupon_usages created this month
  const { count: couponGets } = await supabase
    .from('coupon_usages')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', params.storeId)
    .gte('created_at', `${monthStart}T00:00:00Z`)
    .lt('created_at', `${monthEnd}T00:00:00Z`)

  // ④ 来店 — count conversions (ad conversions as proxy, or inquiries with status=visited)
  const visits = (adReports || []).reduce((s, r) => s + (r.conversions || 0), 0)

  const funnelData = buildFunnelData(
    adClicks,
    lpViews,
    lineAdds,
    couponGets || 0,
    visits,
    `${month}月`,
  )

  // Build month selector options (last 6 months)
  const monthOptions: { value: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthOptions.push({ value: val, label: `${d.getFullYear()}年${d.getMonth() + 1}月` })
  }

  // Overall funnel rate (end-to-end: visits / ad_clicks)
  const overallRate = adClicks > 0 ? ((visits / adClicks) * 100).toFixed(1) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-bold">集客ファネル</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            広告から来店までの流れとボトルネックを確認
          </p>
        </div>
        {/* Month picker */}
        <form>
          <select
            name="month"
            defaultValue={targetMonth}
            onChange={(e) => {
              const url = new URL(window.location.href)
              url.searchParams.set('month', e.target.value)
              window.location.href = url.toString()
            }}
            className="rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </form>
      </div>

      {/* Overall rate banner */}
      {overallRate && (
        <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">広告クリック → 来店 の総転換率</p>
            <p className="text-3xl font-black tabular-nums">{overallRate}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">業界平均</p>
            <p className="text-lg font-bold text-slate-300">1〜3%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">美容・サロン系の目安</p>
          </div>
        </div>
      )}

      {/* No data state */}
      {adClicks === 0 && lpViews === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Activity className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-medium text-muted-foreground">まだデータがありません</p>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs mx-auto">
            「数字を見る」→「データ入力」から広告データを入力すると、ここにファネルが表示されます
          </p>
        </div>
      ) : (
        <FunnelChart data={funnelData} />
      )}

      {/* How to read this */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 mb-1.5">この画面の読み方</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          各ステップの間の<span className="font-semibold text-orange-600">転換率</span>が低いところがボトルネックです。
          オレンジ色で「要改善」と表示されているステップを優先的に改善しましょう。
          下の改善提案は、そのステップに特化したアドバイスです。
        </p>
      </div>
    </div>
  )
}
