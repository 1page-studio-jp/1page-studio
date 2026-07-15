import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { FunnelChart, buildFunnelData } from '@/components/dashboard/funnel-chart'
import { Activity, ChevronDown } from 'lucide-react'

interface Props {
    params: { storeId: string }
    searchParams: { month?: string }
}

export default async function FunnelPage({ params, searchParams }: Props) {
    const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

  const { data: store } = await supabase
      .from('stores')
      .select('id, store_name')
      .eq('id', params.storeId)
      .single()

  if (!store) notFound()

  const today = new Date()
    const targetMonth =
          searchParams.month ??
          `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const [yearStr, monthStr] = targetMonth.split('-')
    const year = parseInt(yearStr)
    const month = parseInt(monthStr)
    const monthStart = `${targetMonth}-01`
    const nextMonthDate = new Date(year, month, 1)
    const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  const { data: adReports } = await supabase
      .from('ad_daily_reports')
      .select('clicks, lp_views, line_adds, conversions')
      .eq('store_id', params.storeId)
      .gte('date', monthStart)
      .lt('date', monthEnd)

  const adClicks   = (adReports ?? []).reduce((s, r) => s + (r.clicks    ?? 0), 0)
    const lpViews    = (adReports ?? []).reduce((s, r) => s + (r.lp_views  ?? 0), 0)
    const lineAdds   = (adReports ?? []).reduce((s, r) => s + (r.line_adds ?? 0), 0)
    const visits     = (adReports ?? []).reduce((s, r) => s + (r.conversions ?? 0), 0)

  const { count: couponGets } = await supabase
      .from('coupon_usages')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', params.storeId)
      .gte('created_at', `${monthStart}T00:00:00Z`)
      .lt('created_at', `${monthEnd}T00:00:00Z`)

  const funnelData = buildFunnelData(
        adClicks,
        lpViews,
        lineAdds,
        couponGets ?? 0,
        visits,
        `${month}月`,
      )

  const monthOptions: { value: string; label: string }[] = []
      for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthOptions.push({ value: val, label: `${d.getFullYear()}年${d.getMonth() + 1}月` })
      }

  const overallRate = adClicks > 0 ? ((visits / adClicks) * 100).toFixed(1) : null

  return (
        <div className="min-h-full bg-gray-50/60">
              <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-10 space-y-5">
              
                      <div className="flex items-start justify-between gap-3">
                                <div>
                                            <h1 className="text-[22px] font-black tracking-tight text-gray-900">集客ファネル</h1>h1>
                                            <p className="text-sm text-gray-400 mt-0.5">広告から来店までの流れとボトルネックを確認</p>p>
                                </div>div>
                      
                                <form method="GET" className="flex items-center gap-2">
                                            <div className="relative">
                                                          <select
                                                                            name="month"
                                                                            defaultValue={targetMonth}
                                                                            className="appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                                                                          >
                                                            {monthOptions.map(o => (
                                                                                              <option key={o.value} value={o.value}>{o.label}</option>option>
                                                                                            ))}
                                                          </select>select>
                                                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            </div>div>
                                            <button
                                                            type="submit"
                                                            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
                                                          >
                                                          表示
                                            </button>button>
                                </form>form>
                      </div>div>
              
                {overallRate !== null && (
                    <div className="flex items-center justify-between rounded-2xl bg-gray-900 px-5 py-4 text-white">
                                <div>
                                              <p className="text-xs text-gray-400 mb-0.5">広告クリック → 来店 の総転換率</p>p>
                                              <p className="text-3xl font-black">{overallRate}%</p>p>
                                </div>div>
                                <div className="text-right">
                                              <p className="text-xs text-gray-400">{month}月の成果</p>p>
                                              <p className="text-sm font-bold text-gray-200 mt-0.5">
                                                {adClicks.toLocaleString()} クリック
                                                              <span className="text-gray-500 mx-1">→</span>span>
                                                {visits.toLocaleString()} 来店
                                              </p>p>
                                </div>div>
                    </div>div>
                      )}
              
                {adClicks === 0 && lpViews === 0 && (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                                <Activity className="mx-auto h-9 w-9 text-gray-200 mb-3" />
                                <p className="text-sm font-semibold text-gray-400">この月のデータはまだありません</p>p>
                                <p className="text-xs text-gray-300 mt-1">広告データが連携されると自動で表示されます</p>p>
                    </div>div>
                      )}
              
                {(adClicks > 0 || lpViews > 0) && (
                    <FunnelChart data={funnelData} />
                  )}
              </div>div>
        </div>div>
      )
}</div>
