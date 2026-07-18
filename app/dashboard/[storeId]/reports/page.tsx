import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from './reports-client'

export default async function ReportsPage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

  const [{ data: reports }, { data: inquiries }] = await Promise.all([
    supabase
      .from('ad_daily_reports')
      .select('id, date, platform, impressions, clicks, cost, sales, inquiries, line_adds, lp_views, data_source')
      .eq('store_id', params.storeId)
      .gte('date', fromDate)
      .order('date', { ascending: true }),
    supabase
      .from('inquiries')
      .select('created_at')
      .eq('store_id', params.storeId)
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  return (
    <ReportsClient
      storeId={params.storeId}
      reports={reports ?? []}
      inquiries={inquiries ?? []}
    />
  )
}
