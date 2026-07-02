import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  TrendingUp, Store, Users, DollarSign, MessageSquare,
  BarChart3, ArrowUpRight, Eye,
} from 'lucide-react'
import { formatCurrency, formatNumber, calcROAS } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function AdminAnalyticsPage() {
  const supabase = createClient()
  const today = new Date()
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

  // 全店舗取得（削除済み除外）
  const { data: stores } = await supabase
    .from('stores')
    .select('id, store_name, industry, status, slug')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 今月の全店舗レポート集計
  const { data: allReports } = await supabase
    .from('ad_daily_reports')
    .select('store_id, cost, sales, lp_views, line_adds, inquiries, reservations')
    .gte('date', monthStart)
    .lte('date', monthEnd)

  // 店舗別に集計
  const storeMetrics = new Map<string, {
    cost: number; sales: number; lp_views: number;
    line_adds: number; inquiries: number; reservations: number;
  }>()

  ;(allReports ?? []).forEach(r => {
    const existing = storeMetrics.get(r.store_id) ?? { cost: 0, sales: 0, lp_views: 0, line_adds: 0, inquiries: 0, reservations: 0 }
    storeMetrics.set(r.store_id, {
      cost: existing.cost + Number(r.cost),
      sales: existing.sales + Number(r.sales),
      lp_views: existing.lp_views + r.lp_views,
      line_adds: existing.line_adds + r.line_adds,
      inquiries: existing.inquiries + r.inquiries,
      reservations: existing.reservations + r.reservations,
    })
  })

  // 全体集計
  const totals = [...storeMetrics.values()].reduce((acc, m) => ({
    cost: acc.cost + m.cost,
    sales: acc.sales + m.sales,
    lp_views: acc.lp_views + m.lp_views,
    line_adds: acc.line_adds + m.line_adds,
    inquiries: acc.inquiries + m.inquiries,
    reservations: acc.reservations + m.reservations,
  }), { cost: 0, sales: 0, lp_views: 0, line_adds: 0, inquiries: 0, reservations: 0 })

  const totalROAS = calcROAS(totals.sales, totals.cost)

  // 業種別集計
  const industryMap = new Map<string, { count: number; sales: number; inquiries: number }>()
  ;(stores ?? []).forEach(s => {
    const m = storeMetrics.get(s.id)
    const existing = industryMap.get(s.industry) ?? { count: 0, sales: 0, inquiries: 0 }
    industryMap.set(s.industry, {
      count: existing.count + 1,
      sales: existing.sales + (m?.sales ?? 0),
      inquiries: existing.inquiries + (m?.inquiries ?? 0),
    })
  })
  const industryRanking = [...industryMap.entries()].sort((a, b) => b[1].sales - a[1].sales)

  // ステータス別カウント
  const statusCounts = (stores ?? []).reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // ランキング（売上順）
  const storeRanking = (stores ?? [])
    .map(s => ({ ...s, metrics: storeMetrics.get(s.id) ?? null }))
    .filter(s => s.metrics)
    .sort((a, b) => (b.metrics?.sales ?? 0) - (a.metrics?.sales ?? 0))
    .slice(0, 10)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">全体分析</h1>
        <p className="text-muted-foreground text-sm mt-1">{format(today, 'yyyy年M月', { locale: ja })} · 全{stores?.length ?? 0}店舗</p>
      </div>

      {/* 全体KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: '総店舗数', value: `${stores?.length ?? 0}店舗`, icon: Store, sub: `稼働中: ${statusCounts['active'] ?? 0}`, color: 'bg-blue-100 text-blue-600' },
          { label: '今月の合計売上', value: formatCurrency(totals.sales), icon: TrendingUp, sub: `広告費: ${formatCurrency(totals.cost)}`, color: 'bg-green-100 text-green-600' },
          { label: '全体ROAS', value: `${totalROAS}倍`, icon: BarChart3, sub: totals.cost > 0 ? '広告効率' : 'データなし', color: 'bg-purple-100 text-purple-600' },
          { label: '今月の問い合わせ', value: `${formatNumber(totals.inquiries)}件`, icon: MessageSquare, sub: `LINE登録: ${formatNumber(totals.line_adds)}件`, color: 'bg-orange-100 text-orange-600' },
        ].map(({ label, value, icon: Icon, sub, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 店舗ステータス内訳 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">契約状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'active', label: '稼働中', color: 'bg-green-500' },
              { key: 'trial', label: 'トライアル', color: 'bg-yellow-500' },
              { key: 'inactive', label: '停止中', color: 'bg-gray-400' },
              { key: 'canceled', label: '解約', color: 'bg-red-400' },
            ].map(({ key, label, color }) => {
              const count = statusCounts[key] ?? 0
              const total = stores?.length ?? 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium">{count}店舗 ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 業種別ランキング */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">業種別 店舗数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {industryRanking.slice(0, 8).map(([industry, data]) => (
                <div key={industry} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{industry || '未設定'}</span>
                    <Badge variant="secondary" className="text-xs">{data.count}店</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{formatCurrency(data.sales)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(data.inquiries)}件</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 今月の店舗別売上ランキング */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">今月の店舗別実績（売上順）</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {storeRanking.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">店舗名</th>
                  <th className="pb-2 pr-4 font-medium">業種</th>
                  <th className="pb-2 pr-4 font-medium text-right">広告費</th>
                  <th className="pb-2 pr-4 font-medium text-right">売上</th>
                  <th className="pb-2 pr-4 font-medium text-right">ROAS</th>
                  <th className="pb-2 pr-4 font-medium text-right">LP</th>
                  <th className="pb-2 pr-4 font-medium text-right">LINE</th>
                  <th className="pb-2 font-medium text-right">問い合わせ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {storeRanking.map((s, i) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 text-muted-foreground font-mono">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/stores/${s.id}`} className="font-medium hover:text-primary hover:underline flex items-center gap-1">
                        {s.store_name}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{s.industry}</td>
                    <td className="py-3 pr-4 text-right">{formatCurrency(s.metrics?.cost ?? 0)}</td>
                    <td className="py-3 pr-4 text-right font-medium">{formatCurrency(s.metrics?.sales ?? 0)}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`font-medium ${(s.metrics?.cost ?? 0) > 0 && calcROAS(s.metrics?.sales ?? 0, s.metrics?.cost ?? 0) >= 3 ? 'text-green-600' : ''}`}>
                        {s.metrics?.cost ? `${calcROAS(s.metrics.sales, s.metrics.cost)}倍` : '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatNumber(s.metrics?.lp_views ?? 0)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatNumber(s.metrics?.line_adds ?? 0)}</td>
                    <td className="py-3 text-right text-muted-foreground">{formatNumber(s.metrics?.inquiries ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              今月の広告データがまだありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 全店舗一覧（データなし含む） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">全店舗一覧 ({stores?.length ?? 0}件)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">店舗名</th>
                <th className="pb-2 pr-4 font-medium">ステータス</th>
                <th className="pb-2 pr-4 font-medium">今月売上</th>
                <th className="pb-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(stores ?? []).map(s => {
                const m = storeMetrics.get(s.id)
                return (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-4 font-medium">{s.store_name}</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={s.status === 'active' ? 'success' : s.status === 'trial' ? 'warning' : 'secondary'} className="text-xs">
                        {s.status === 'active' ? '稼働中' : s.status === 'trial' ? 'トライアル' : s.status === 'inactive' ? '停止中' : '解約'}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{m ? formatCurrency(m.sales) : '—'}</td>
                    <td className="py-2.5">
                      <div className="flex gap-2">
                        <Link href={`/admin/stores/${s.id}`} className="text-xs text-primary hover:underline">詳細</Link>
                        <Link href={`/dashboard/${s.id}`} className="text-xs text-muted-foreground hover:underline">DB</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
