'use client'

import { useState } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ComposedChart, Area,
} from 'recharts'
import { BarChart3, ClipboardList, TrendingUp, Eye, Heart, MessageSquare, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GrowthChart, type GrowthMetric } from '@/components/dashboard/growth-chart'

interface AdReport {
  id: string
  date: string
  platform: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  line_adds: number
}

interface MonthlyStat {
  month: string
  line_adds: number
  inquiries_count: number
  revenue: number
  lp_views: number
  isCurrentMonth: boolean
}

interface ReportsClientProps {
  storeId: string
  reports: AdReport[]
  inquiries: { created_at: string }[]
  monthlyStats?: MonthlyStat[]
}

function aggregateByDate(reports: AdReport[]) {
  const map: Record<string, any> = {}
  for (const r of reports) {
    if (!map[r.date]) {
      map[r.date] = { date: r.date, spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0, line_adds: 0 }
    }
    map[r.date].spend += r.spend || 0
    map[r.date].revenue += r.revenue || 0
    map[r.date].clicks += r.clicks || 0
    map[r.date].impressions += r.impressions || 0
    map[r.date].conversions += r.conversions || 0
    map[r.date].line_adds += r.line_adds || 0
  }
  return Object.values(map).map(d => ({
    ...d,
    label: format(new Date(d.date), 'M/d', { locale: ja }),
    // 費用対効果 = revenue / spend (ROAS の平易版)
    adEffect: d.spend > 0 ? +(d.revenue / d.spend).toFixed(2) : 0,
    // 1件あたりコスト (CPA の平易版)
    costPerPerson: d.conversions > 0 ? Math.round(d.spend / d.conversions) : 0,
  }))
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-card p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export function ReportsClient({ storeId, reports, inquiries, monthlyStats = [] }: ReportsClientProps) {
  const [tab, setTab] = useState<'growth' | 'chart' | 'input'>('growth')

  // Build GrowthMetric[] from monthlyStats
  const growthMetrics: GrowthMetric[] = monthlyStats.length > 0 ? [
    {
      label: 'LINE登録',
      unit: '件',
      color: '#22c55e',
      data: monthlyStats.map(m => ({ month: m.month, value: m.line_adds, isCurrentMonth: m.isCurrentMonth })),
    },
    {
      label: '問い合わせ',
      unit: '件',
      color: '#6366f1',
      data: monthlyStats.map(m => ({ month: m.month, value: m.inquiries_count, isCurrentMonth: m.isCurrentMonth })),
    },
    {
      label: '売上',
      unit: '円',
      color: '#f59e0b',
      data: monthlyStats.map(m => ({ month: m.month, value: m.revenue, isCurrentMonth: m.isCurrentMonth })),
    },
    {
      label: 'LP閲覧',
      unit: '回',
      color: '#3b82f6',
      data: monthlyStats.map(m => ({ month: m.month, value: m.lp_views, isCurrentMonth: m.isCurrentMonth })),
    },
  ] : []
  const [inputForm, setInputForm] = useState({
    date: new Date().toISOString().split('T')[0],
    platform: 'google_ads',
    impressions: '',
    clicks: '',
    spend: '',
    conversions: '',
    revenue: '',
    line_adds: '',
  })
  const [inputLoading, setInputLoading] = useState(false)
  const [inputError, setInputError] = useState('')
  const [inputSuccess, setInputSuccess] = useState(false)

  const daily = aggregateByDate(reports)

  const totals = daily.reduce((acc, d) => ({
    spend: acc.spend + d.spend,
    revenue: acc.revenue + d.revenue,
    clicks: acc.clicks + d.clicks,
    line_adds: acc.line_adds + d.line_adds,
    conversions: acc.conversions + d.conversions,
  }), { spend: 0, revenue: 0, clicks: 0, line_adds: 0, conversions: 0 })

  const totalEffect = totals.spend > 0 ? +(totals.revenue / totals.spend).toFixed(1) : 0
  const costPerPerson = totals.conversions > 0 ? Math.round(totals.spend / totals.conversions) : 0

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInputLoading(true)
    setInputError('')
    setInputSuccess(false)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          date: inputForm.date,
          platform: inputForm.platform,
          impressions: Number(inputForm.impressions) || 0,
          clicks: Number(inputForm.clicks) || 0,
          spend: Number(inputForm.spend) || 0,
          conversions: Number(inputForm.conversions) || 0,
          revenue: Number(inputForm.revenue) || 0,
          line_adds: Number(inputForm.line_adds) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登録に失敗しました')
      setInputSuccess(true)
      setInputForm(f => ({ ...f, impressions: '', clicks: '', spend: '', conversions: '', revenue: '', line_adds: '' }))
    } catch (err: any) {
      setInputError(err.message)
    } finally {
      setInputLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">数字を確認する</h1>
            <p className="text-muted-foreground mt-1">過去30日間の広告パフォーマンス</p>
          </div>
          <div className="flex gap-2">
            {([
              { key: 'growth', label: '成長グラフ', icon: TrendingUp },
              { key: 'chart', label: '広告詳細', icon: BarChart3 },
              { key: 'input', label: 'データ入力', icon: ClipboardList },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  tab === key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Growth Chart Tab */}
        {tab === 'growth' && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold">お店の成長グラフ</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                先月と今月を比べて、どれくらい成長しているかひと目でわかります
              </p>
              {growthMetrics.length > 0 ? (
                <GrowthChart metrics={growthMetrics} />
              ) : (
                <div className="py-12 text-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">データを入力すると成長グラフが表示されます</p>
                  <button
                    onClick={() => setTab('input')}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    データを入力する
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'chart' && (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-2xl bg-card border p-4">
                <p className="text-xs text-muted-foreground mb-1">広告費の合計</p>
                <p className="text-xl font-bold">{formatCurrency(totals.spend)}</p>
              </div>
              <div className="rounded-2xl bg-card border p-4">
                <p className="text-xs text-muted-foreground mb-1">売上（広告経由）</p>
                <p className={`text-xl font-bold ${totals.revenue > 0 ? 'text-emerald-600' : ''}`}>
                  {totals.revenue > 0 ? formatCurrency(totals.revenue) : '—'}
                </p>
              </div>
              <div className="rounded-2xl bg-card border p-4">
                <p className="text-xs text-muted-foreground mb-1">広告の費用対効果</p>
                <p className="text-xl font-bold">
                  {totalEffect > 0 ? (
                    <span className={totalEffect >= 2 ? 'text-emerald-600' : 'text-amber-500'}>
                      {totalEffect}倍
                    </span>
                  ) : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">1円 → {totalEffect}円の売上</p>
              </div>
              <div className="rounded-2xl bg-card border p-4">
                <p className="text-xs text-muted-foreground mb-1">お客様1人を呼ぶコスト</p>
                <p className="text-xl font-bold">
                  {costPerPerson > 0 ? formatCurrency(costPerPerson) : '—'}
                </p>
              </div>
            </div>

            {daily.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-muted-foreground/20 bg-card py-16 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground">データがまだありません</p>
                <p className="text-sm text-muted-foreground/70 mt-1">「データ入力」から数字を追加すると、ここにグラフが表示されます</p>
                <button
                  onClick={() => setTab('input')}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  データを入力する
                </button>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Spend vs Revenue */}
                <div className="rounded-2xl border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-1">広告費と売上の推移</h3>
                  <p className="text-xs text-muted-foreground mb-4">棒グラフ = 広告費 / 折れ線 = 売上</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={daily} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="spend" fill="hsl(220 14% 88%)" name="広告費" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(142 71% 45%)" strokeWidth={2.5} name="売上" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Ad Effect (ROAS in plain language) */}
                <div className="rounded-2xl border bg-card p-5">
                  <h3 className="text-sm font-semibold mb-1">広告の費用対効果</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    1円の広告費で何円の売上が生まれたか。2倍以上が目安です
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={daily} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}倍`} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v: number) => [`${v}倍`, '費用対効果']}
                        content={<CustomTooltip />}
                      />
                      {/* Reference line at 2x */}
                      <Line type="monotone" dataKey={() => 2} stroke="hsl(var(--border))" strokeDasharray="4 4" dot={false} name="目標ライン" />
                      <Line type="monotone" dataKey="adEffect" stroke="hsl(var(--primary))" strokeWidth={2.5} name="費用対効果" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Clicks & LINE */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <h3 className="text-sm font-semibold">広告をクリックした人</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">広告から LP に来た人の数</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v: number) => [`${v.toLocaleString()}人`, 'クリック']} content={<CustomTooltip />} />
                        <Bar dataKey="clicks" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} name="クリック" maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold">LINE 新規登録</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">友だち追加してくれた人の数</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(v: number) => [`${v.toLocaleString()}人`, 'LINE登録']} content={<CustomTooltip />} />
                        <Bar dataKey="line_adds" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} name="LINE登録" maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {/* Data Input Tab */}
        {tab === 'input' && (
          <div className="max-w-lg">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="text-base font-semibold mb-1">広告データを入力</h3>
              <p className="text-sm text-muted-foreground mb-6">同じ日・同じ媒体のデータは上書きされます</p>

              <form onSubmit={handleInputSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">日付</Label>
                    <Input
                      id="date" type="date"
                      value={inputForm.date}
                      onChange={e => setInputForm(f => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">広告媒体</Label>
                    <select
                      id="platform"
                      value={inputForm.platform}
                      onChange={e => setInputForm(f => ({ ...f, platform: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="google_ads">Google 広告</option>
                      <option value="meta_ads">Meta（Instagram）広告</option>
                      <option value="line_ads">LINE 広告</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'spend', label: '広告費（円）', placeholder: '50000', hint: '使った金額' },
                    { key: 'revenue', label: '売上（円）', placeholder: '150000', hint: '広告経由の売上' },
                    { key: 'impressions', label: '表示回数', placeholder: '10000', hint: '広告が表示された回数' },
                    { key: 'clicks', label: 'クリック数', placeholder: '200', hint: '広告がクリックされた回数' },
                    { key: 'conversions', label: '成果件数', placeholder: '10', hint: '購入・来店・予約など' },
                    { key: 'line_adds', label: 'LINE 登録数', placeholder: '30', hint: '新規友だち追加' },
                  ].map(({ key, label, placeholder, hint }) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key} type="number" min="0" placeholder={placeholder}
                        value={(inputForm as any)[key]}
                        onChange={e => setInputForm(f => ({ ...f, [key]: e.target.value }))}
                      />
                      <p className="text-[10px] text-muted-foreground">{hint}</p>
                    </div>
                  ))}
                </div>

                {inputError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {inputError}
                  </div>
                )}
                {inputSuccess && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                    ✅ データを保存しました
                  </div>
                )}

                <button
                  type="submit" disabled={inputLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background font-medium text-sm py-3 hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                >
                  {inputLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      保存中...
                    </span>
                  ) : '保存する'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
