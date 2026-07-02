import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from './reports-client'

export default async function ReportsPage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 過去30日分のデータを取得
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: reports } = await supabase
    .from('ad_daily_reports')
    .select('*')
    .eq('store_id', params.storeId)
    .gte('date', fromDate)
    .order('date', { ascending: true })

  // 問い合わせ数 (月別)
  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('created_at')
    .eq('store_id', params.storeId)
    .gte('created_at', thirtyDaysAgo.toISOString())

  // 過去6ヶ月の月別集計データ（成長グラフ用）
  const today = new Date()
  const monthlyStats: Array<{
    month: string
    line_adds: number
    inquiries_count: number
    revenue: number
    lp_views: number
    isCurrentMonth: boolean
  }> = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const nextD = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonthStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-01`

    const { data: mReports } = await supabase
      .from('ad_daily_reports')
      .select('line_adds, revenue, lp_views')
      .eq('store_id', params.storeId)
      .gte('date', monthStr)
      .lt('date', nextMonthStr)

    const { count: inqCount } = await supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', params.storeId)
      .gte('created_at', monthStr)
      .lt('created_at', nextMonthStr)

    const sum = (mReports || []).reduce(
      (acc, r) => ({
        line_adds: acc.line_adds + (r.line_adds || 0),
        revenue: acc.revenue + (r.revenue || 0),
        lp_views: acc.lp_views + (r.lp_views || 0),
      }),
      { line_adds: 0, revenue: 0, lp_views: 0 }
    )

    monthlyStats.push({
      month: `${d.getMonth() + 1}月`,
      line_adds: sum.line_adds,
      inquiries_count: inqCount || 0,
      revenue: sum.revenue,
      lp_views: sum.lp_views,
      isCurrentMonth: i === 0,
    })
  }

  return (
    <ReportsClient
      storeId={params.storeId}
      reports={reports || []}
      inquiries={inquiries || []}
      monthlyStats={monthlyStats}
    />
  )
}
