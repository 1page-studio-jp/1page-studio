'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import {
  ResponsiveContainer, LineChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ComposedChart, Area,
} from 'recharts'
import { TrendingUp, Plus, BarChart3, ClipboardList, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// DBの実際のフィールド名に合わせた型定義
interface AdReport {
  id: string
  date: string
  platform: string
  impressions: number
  clicks: number
  cost: number       // 広告費（旧 spend）
  sales: number      // 売上（旧 revenue）
  inquiries: number  // 問い合わせ数（旧 conversions）
  line_adds: number
  lp_views: number
  data_source: string
}

interface ReportsClientProps {
  storeId: string
  reports: AdReport[]
  inquiries: { created_at: string }[]
}

function aggregateByDate(reports: AdReport[]) {
  const map: Record<string, {
    date: string
    cost: number
    sales: number
    clicks: number
    impressions: number
    inquiries: number
    line_adds: number
  }> = {}

  for (const r of reports) {
    if (!map[r.date]) {
      map[r.date] = {
        date: r.date,
        cost: 0, sales: 0, clicks: 0,
        impressions: 0, inquiries: 0, line_adds: 0,
      }
    }
    map[r.date].cost       += r.cost       ?? 0
    map[r.date].sales      += r.sales      ?? 0
    map[r.date].clicks     += r.clicks     ?? 0
    map[r.date].impressions += r.impressions ?? 0
    map[r.date].inquiries  += r.inquiries  ?? 0
    map[r.date].line_adds  += r.line_adds  ?? 0
  }

  return Object.values(map).map(d => ({
    ...d,
    label: format(new Date(d.date), 'M/d', { locale: ja }),
    roas: d.cost > 0 ? Math.round((d.sales / d.cost) * 100) / 100 : 0,
    cpa:  d.inquiries > 0 ? Math.round(d.cost / d.inquiries) : 0,
    ctr:  d.impressions > 0 ? Math.round((d.clicks / d.impressions) * 1000) / 10 : 0,
  }))
}

export function ReportsClient({ storeId, reports, inquiries }: ReportsClientProps) {
  const [tab, setTab] = useState<'chart' | 'input'>('chart')
  const [form, setForm] = useState({
    date:        new Date().toISOString().split('T')[0],
    platform:    'google_ads',
    impressions: '',
    clicks:      '',
    cost:        '',   // 広告費
    sales:       '',   // 売上
    inquiries:   '',   // コンバージョン（問い合わせ数）
    line_adds:   '',
  })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  // AI インサイト
  const [aiInsight, setAiInsight] = useState<{ comment: string; todos: string[] } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError]     = useState('')

  const fetchInsight = async () => {
    setAiLoading(true)
    setAiError('')
    try {
      const res  = await fetch('/api/ai/insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AIの分析に失敗しました')
      setAiInsight({ comment: data.comment, todos: data.todos ?? [] })
    } catch (err: any) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  const daily  = aggregateByDate(reports)
  const totals = daily.reduce(
    (acc, d) => ({
      cost:        acc.cost        + d.cost,
      sales:       acc.sales       + d.sales,
      clicks:      acc.clicks      + d.clicks,
      impressions: acc.impressions + d.impressions,
      inquiries:   acc.inquiries   + d.inquiries,
      line_adds:   acc.line_adds   + d.line_adds,
    }),
    { cost: 0, sales: 0, clicks: 0, impressions: 0, inquiries: 0, line_adds: 0 }
  )

  const totalRoas = totals.cost > 0 ? Math.round((totals.sales / totals.cost) * 100) / 100 : 0
  const totalCpa  = totals.inquiries > 0 ? Math.round(totals.cost / totals.inquiries) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id:    storeId,
          date:        form.date,
          platform:    form.platform,
          impressions: Number(form.impressions) || 0,
          clicks:      Number(form.clicks)      || 0,
          cost:        Number(form.cost)        || 0,
          sales:       Number(form.sales)       || 0,
          inquiries:   Number(form.inquiries)   || 0,
          line_adds:   Number(form.line_adds)   || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '登録に失敗しました')
      setSuccess(true)
      setForm(f => ({
        ...f,
        impressions: '', clicks: '', cost: '',
        sales: '', inquiries: '', line_adds: '',
      }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputField = (
    key: keyof typeof form,
    label: string,
    placeholder: string,
    prefix?: string,
  ) => (
    <div>
      <Label className="text-xs font-bold text-gray-600">{label}</Label>
      <div className="relative mt-1">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{prefix}</span>
        )}
        <input
          type="number"
          value={form[key]}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm text-gray-900',
            'focus:outline-none focus:ring-2 focus:ring-indigo-400 transition',
            prefix ? 'pl-7 pr-3' : 'px-3',
          )}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-full bg-gray-50/60">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-10 space-y-5">

        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-black tracking-tight text-gray-900">数字を見る</h1>
            <p className="text-sm text-gray-400 mt-0.5">過去30日間の広告パフォーマンス</p>
          </div>

          <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <button
              onClick={() => setTab('chart')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                tab === 'chart' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-700'
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              グラフ
            </button>
            <button
              onClick={() => setTab('input')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                tab === 'input' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-700'
              )}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              データ入力
            </button>
          </div>
        </div>

        {/* --- グラフタブ --- */}
        {tab === 'chart' && (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '広告費',       value: formatCurrency(totals.cost)  },
                { label: '売上（広告経由）', value: formatCurrency(totals.sales) },
                { label: 'ROAS',         value: `${totalRoas}x`              },
                { label: 'CPA',          value: totalCpa > 0 ? formatCurrency(totalCpa) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{value}</p>
                </div>
              ))}
            </div>

            {/* ── AIインサイト ──────────────────────────────── */}
            {daily.length > 0 && (
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <p className="text-sm font-black text-gray-900">AIアドバイス</p>
                  </div>
                  {!aiInsight && (
                    <button
                      onClick={fetchInsight}
                      disabled={aiLoading}
                      className="flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {aiLoading ? '分析中...' : '今すぐ分析'}
                      {!aiLoading && <ChevronRight className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {aiLoading && (
                  <div className="flex items-center gap-2 py-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                    <p className="text-xs text-gray-400">30日間のデータを分析しています...</p>
                  </div>
                )}

                {aiError && (
                  <p className="text-xs text-red-500 mt-1">{aiError}</p>
                )}

                {aiInsight && !aiLoading && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 leading-relaxed">{aiInsight.comment}</p>
                    {aiInsight.todos.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {aiInsight.todos.map((todo, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                              {i + 1}
                            </span>
                            <p className="text-xs font-medium text-gray-700">{todo}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={fetchInsight}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      再分析する
                    </button>
                  </div>
                )}

                {!aiInsight && !aiLoading && !aiError && (
                  <p className="text-xs text-gray-400">
                    過去30日間のデータをAIが分析して、今週やるべきことを教えてくれます。
                  </p>
                )}
              </div>
            )}

            {daily.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                <BarChart3 className="mx-auto h-9 w-9 text-gray-200 mb-3" />
                <p className="text-sm font-semibold text-gray-400">データがまだありません</p>
                <button
                  onClick={() => setTab('input')}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  データを入力する
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 広告費・売上グラフ */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">広告費・売上（日別）</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `¥${(v / 1000).toFixed(0)}k`} width={45} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="sales" fill="#eef2ff" stroke="#6366f1" strokeWidth={2} name="売上" dot={false} />
                      <Bar dataKey="cost" fill="#d1d5db" name="広告費" radius={[3, 3, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* ROAS */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">ROAS 推移</p>
                  <p className="text-[11px] text-gray-300 mb-3">広告費1円あたりの売上。2.0以上が目安</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}x`} width={35} />
                      <Tooltip
                        formatter={(v: number) => [`${v}x`, 'ROAS']}
                        contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }}
                      />
                      <Line type="monotone" dataKey="roas" stroke="#6366f1" strokeWidth={2} dot={false} name="ROAS" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* クリック・LINE登録 */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">クリック・LINE登録（日別）</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <ComposedChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={30} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e5e7eb' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="clicks"    fill="#a5b4fc" name="クリック"   radius={[3, 3, 0, 0]} />
                      <Bar dataKey="line_adds" fill="#34d399" name="LINE登録" radius={[3, 3, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- データ入力タブ --- */}
        {tab === 'input' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-gray-900 mb-4">広告データを手動入力</p>

            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">登録しました</p>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-gray-600">日付</Label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-gray-600">プラットフォーム</Label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="google_ads">Google 広告</option>
                    <option value="facebook">Meta 広告</option>
                    <option value="line">LINE 広告</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {inputField('impressions', 'インプレッション', '1000')}
                {inputField('clicks',      'クリック数',       '50')}
                {inputField('cost',        '広告費',           '5000', '¥')}
                {inputField('sales',       '売上',             '15000', '¥')}
                {inputField('inquiries',   'コンバージョン数', '3')}
                {inputField('line_adds',   'LINE登録数',       '10')}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '登録中...' : '登録する'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
