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
  const supabase = createClient()

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

  // â  åºåã¯ãªãã¯ + LPé²è¦§ (from ad_daily_reports)
  const { data: adReports } = await supabase
    .from('ad_daily_reports')
    .select('clicks, lp_views, line_adds, conversions')
    .eq('store_id', params.storeId)
    .gte('date', monthStart)
    .lt('date', monthEnd)

  const adClicks = (adReports || []).reduce((s, r) => s + (r.clicks || 0), 0)
  const lpViews = (adReports || []).reduce((s, r) => s + (r.lp_views || 0), 0)
  const lineAddsFromAd = (adReports || []).reduce((s, r) => s + (r.line_adds || 0), 0)

  // â¡ LINEç»é² â also count from direct LP visits (prefer ad_daily_reports sum)
  const lineAdds = lineAddsFromAd

  // â¢ ã¯ã¼ãã³åå¾ â count coupon_usages created this month
  const { count: couponGets } = await supabase
    .from('coupon_usages')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', params.storeId)
    .gte('created_at', `${monthStart}T00:00:00Z`)
    .lt('created_at', `${monthEnd}T00:00:00Z`)

  // â£ æ¥åº â count conversions (ad conversions as proxy, or inquiries with status=visited)
  const visits = (adReports || []).reduce((s, r) => s + (r.conversions || 0), 0)

  const funnelData = buildFunnelData(
    adClicks,
    lpViews,
    lineAdds,
    couponGets || 0,
    visits,
    `${month}æ`,
  )

  // Build month selector options (last 6 months)
  const monthOptions: { value: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthOptions.push({ value: val, label: `${d.getFullYear()}å¹´${d.getMonth() + 1}æ` })
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
            <h1 className="text-xl font-bold">éå®¢ãã¡ãã«</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            åºåããæ¥åºã¾ã§ã®æµãã¨ããã«ããã¯ãç¢ºèª
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
            <p className="text-xs text-slate-400 mb-0.5">åºåã¯ãªãã¯ â æ¥åº ã®ç·è»¢æç</p>
            <p className="text-3xl font-black tabular-nums">{overallRate}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">æ¥­çå¹³å</p>
            <p className="text-lg font-bold text-slate-300">1ã3%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">ç¾å®¹ã»ãµã­ã³ç³»ã®ç®å®</p>
          </div>
        </div>
      )}

      {/* No data state */}
      {adClicks === 0 && lpViews === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Activity className="h-12 w-12 text-slate-200 mx-auto mb-4" />
          <p className="font-medium text-muted-foreground">ã¾ã ãã¼ã¿ãããã¾ãã</p>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs mx-auto">
            ãæ°å­ãè¦ããâããã¼ã¿å¥åãããåºåãã¼ã¿ãå¥åããã¨ãããã«ãã¡ãã«ãè¡¨ç¤ºããã¾ã
          </p>
        </div>
      ) : (
        <FunnelChart data={funnelData} />
      )}

      {/* How to read this */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 mb-1.5">ãã®ç»é¢ã®èª­ã¿æ¹</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          åã¹ãããã®éã®<span className="font-semibold text-orange-600">è»¢æç</span>ãä½ãã¨ãããããã«ããã¯ã§ãã
          ãªã¬ã³ã¸è²ã§ãè¦æ¹åãã¨è¡¨ç¤ºããã¦ããã¹ããããåªåçã«æ¹åãã¾ãããã
          ä¸ã®æ¹åææ¡ã¯ããã®ã¹ãããã«ç¹åããã¢ããã¤ã¹ã§ãã
        </p>
      </div>
    </div>
  )
}
