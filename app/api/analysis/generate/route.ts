import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateAiComment, generateStoreAnalysis, StoreMetricsForAI } from '@/lib/openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { storeId, period } = await request.json()
    if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

    const { data: store } = await supabase
      .from('stores')
      .select('store_name, industry')
      .eq('id', storeId)
      .single()

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - (period || 30))

    const { data: reports } = await supabase
      .from('ad_daily_reports')
      .select('*')
      .eq('store_id', storeId)
      .gte('report_date', startDate.toISOString().split('T')[0])
      .lte('report_date', endDate.toISOString().split('T')[0])

    const totals = (reports || []).reduce(
      (acc, r) => ({
        cost: acc.cost + (r.cost || 0),
        sales: acc.sales + (r.sales || 0),
        lpViews: acc.lpViews + (r.lp_views || 0),
        lineAdds: acc.lineAdds + (r.line_adds || 0),
        inquiries: acc.inquiries + (r.inquiries || 0),
        reservations: acc.reservations + (r.reservations || 0),
        couponUses: acc.couponUses + (r.coupon_uses || 0),
      }),
      { cost: 0, sales: 0, lpViews: 0, lineAdds: 0, inquiries: 0, reservations: 0, couponUses: 0 }
    )

    const roas = totals.cost > 0 ? totals.sales / totals.cost : 0
    const cpa = totals.lineAdds > 0 ? totals.cost / totals.lineAdds : 0
    const lineAddRate = totals.lpViews > 0 ? (totals.lineAdds / totals.lpViews) * 100 : 0

    const platformMap = {}
    for (const r of reports || []) {
      if (r.platform) platformMap[r.platform] = (platformMap[r.platform] || 0) + (r.cost || 0)
    }
    const topPlatform = Object.entries(platformMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'organic'

    const metrics = {
      storeName: store.store_name,
      industry: store.industry || 'general',
      period: 'past ' + (period || 30) + ' days',
      ...totals,
      roas, cpa, lineAddRate, topPlatform,
    }

    const [aiComment, analysis] = await Promise.all([
      generateAiComment(metrics),
      generateStoreAnalysis(metrics),
    ])

    const { data: saved } = await supabase
      .from('ai_analysis_reports')
      .insert({
        store_id: storeId,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0],
        ai_comment: aiComment.comment,
        suggestions: aiComment.suggestions,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        priorities: analysis.priorities,
        metrics: totals,
      })
      .select()
      .single()

    return NextResponse.json({ success: true, report: saved || { ai_comment: aiComment.comment, suggestions: aiComment.suggestions, ...analysis } })
  } catch (error) {
    console.error('Analysis generation error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
