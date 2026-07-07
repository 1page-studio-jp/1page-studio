import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // 店舗の全LP（新しい順）取得
  const { data: lps } = await supabase
    .from('lp_pages')
    .select('id, created_at, status, appeal_angle, catch_copy')
    .eq('store_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (!lps || lps.length === 0) return NextResponse.json([])

  // 各LPの活動期間にストアの広告データを集計
  const results = await Promise.all(lps.map(async (lp, i) => {
    const from = lp.created_at.slice(0, 10)
    const to = lps[i + 1]?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10)

    const { data: reports } = await supabase
      .from('ad_daily_reports')
      .select('lp_views, line_adds, cost, sales, inquiries')
      .eq('store_id', params.id)
      .gte('date', from)
      .lt('date', to)

    const totals = (reports || []).reduce((acc, r) => ({
      lp_views: acc.lp_views + (r.lp_views || 0),
      line_adds: acc.line_adds + (r.line_adds || 0),
      cost: acc.cost + (r.cost || 0),
      sales: acc.sales + (r.sales || 0),
      inquiries: acc.inquiries + (r.inquiries || 0),
    }), { lp_views: 0, line_adds: 0, cost: 0, sales: 0, inquiries: 0 })

    const cvr = totals.lp_views > 0 ? ((totals.line_adds / totals.lp_views) * 100).toFixed(1) : '0.0'

    return {
      lp_id: lp.id,
      period_from: from,
      period_to: to,
      days: Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)),
      ...totals,
      cvr,
    }
  }))

  return NextResponse.json(results)
}
