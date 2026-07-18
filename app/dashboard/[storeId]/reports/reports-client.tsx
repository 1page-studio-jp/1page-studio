'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import {
  ResponsiveContainer, LineChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ComposedChart, Area,
} from 'recharts'
import {
  TrendingUp, Plus, BarChart3, ClipboardList,
  CheckCircle2, Sparkles, ChevronRight, Upload,
  FileText, X, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// ── 型定義 ─────────────────────────────────────────────────
interface AdReport {
  id: string
  date: string
  platform: string
  impressions: number
  clicks: number
  cost: number
  sales: number
  inquiries: number
  line_adds: number
  lp_views: number
  data_source: string
}

interface ReportsClientProps {
  storeId: string
  reports: AdReport[]
  inquiries: { created_at: string }[]
}

interface ImportRow {
  date: string
  impressions: number
  clicks: number
  cost: number
  sales: number
  inquiries: number
  line_adds: number
}

// ── CSV パーサーユーティリティ ─────────────────────────────

/** クォート付き CSV の1行をパース */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      result.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

/** 数値文字列を数値に変換（¥・カンマ・%・円 を除去） */
function parseNum(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/[¥,\s%円]/g, '')) || 0
}

/**
 * Google広告 日別パフォーマンスレポート CSV をパース
 * - 先頭にメタデータ行あり → "日付" を含む行をヘッダーとして自動検出
 * - キャンペーン単位の複数行を日付で集計
 * - "合計" 行などはスキップ
 */
function parseGoogleAdsCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/)

  // "日付" を含むヘッダー行を検索
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('日付') || lines[i].toLowerCase().startsWith('date,')) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return []

  const headers = parseCSVLine(lines[headerIdx]).map(h => h.replace(/"/g, '').trim())

  const col = (keywords: string[]) =>
    headers.findIndex(h => keywords.some(k => h.includes(k)))

  const dateIdx  = col(['日付', 'Date'])
  const impIdx   = col(['インプレッション数', 'Impressions'])
  const clkIdx   = col(['クリック数', 'Clicks'])
  const costIdx  = col(['費用', 'Cost'])
  const convIdx  = col(['コンバージョン数', 'Conversions', 'コンバージョン'])

  const map: Record<string, ImportRow> = {}

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw) continue
    const cells = parseCSVLine(raw)

    // 合計行・フッターをスキップ
    const first = (cells[0] || '').replace(/"/g, '').trim()
    if (['合計', 'Total', 'すべて', ''].includes(first)) continue

    // 日付: "2024/07/01" → "2024-07-01"
    const dateRaw = (cells[dateIdx] || '').replace(/\//g, '-').replace(/"/g, '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) continue

    if (!map[dateRaw]) {
      map[dateRaw] = { date: dateRaw, impressions: 0, clicks: 0, cost: 0, sales: 0, inquiries: 0, line_adds: 0 }
    }
    map[dateRaw].impressions += impIdx  >= 0 ? parseNum(cells[impIdx])  : 0
    map[dateRaw].clicks      += clkIdx  >= 0 ? parseNum(cells[clkIdx])  : 0
    map[dateRaw].cost        += costIdx >= 0 ? parseNum(cells[costIdx]) : 0
    map[dateRaw].inquiries   += convIdx >= 0 ? parseNum(cells[convIdx]) : 0
  }

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Meta広告 CSVレポートをパース
 * - 先頭行がヘッダー
 * - "配信日" または "日付" 列を日付として使用
 * - キャンペーン・広告セット単位を日付で集計
 */
function parseMetaAdsCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim())

  const col = (keywords: string[]) =>
    headers.findIndex(h => keywords.some(k => h.includes(k)))

  const dateIdx  = col(['配信日', '日付', 'Date'])
  const impIdx   = col(['インプレッション', 'Impressions'])
  const clkIdx   = col(['クリック（全て）', 'Clicks (all)', 'Clicks'])
  const costIdx  = col(['消費金額', 'Amount spent', 'Spend'])
  const resIdx   = col(['結果', 'Results'])

  const map: Record<string, ImportRow> = {}

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim())
    if (cells.length < 2) continue

    const dateRaw = (cells[dateIdx] || '').trim()
    // Meta は YYYY-MM-DD 形式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) continue

    if (!map[dateRaw]) {
      map[dateRaw] = { date: dateRaw, impressions: 0, clicks: 0, cost: 0, sales: 0, inquiries: 0, line_adds: 0 }
    }
    map[dateRaw].impressions += impIdx  >= 0 ? parseNum(cells[impIdx])  : 0
    map[dateRaw].clicks      += clkIdx  >= 0 ? parseNum(cells[clkIdx])  : 0
    map[dateRaw].cost        += costIdx >= 0 ? parseNum(cells[costIdx]) : 0
    map[dateRaw].inquiries   += resIdx  >= 0 ? parseNum(cells[resIdx])  : 0
  }

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
}

// ── 集計ユーティリティ ─────────────────────────────────────

function aggregateByDate(reports: AdReport[]) {
  const map: Record<string, {
    date: string; cost: number; sales: number; clicks: number
    impressions: number; inquiries: number; line_adds: number
  }> = {}

  for (const r of reports) {
    if (!map[r.date]) {
      map[r.date] = { date: r.date, cost: 0, sales: 0, clicks: 0, impressions: 0, inquiries: 0, line_adds: 0 }
    }
    map[r.date].cost        += r.cost        ?? 0
    map[r.date].sales       += r.sales       ?? 0
    map[r.date].clicks      += r.clicks      ?? 0
    map[r.date].impressions += r.impressions ?? 0
    map[r.date].inquiries   += r.inquiries   ?? 0
    map[r.date].line_adds   += r.line_adds   ?? 0
  }

  return Object.values(map).map(d => ({
    ...d,
    label:  format(new Date(d.date), 'M/d', { locale: ja }),
    roas:   d.cost > 0 ? Math.round((d.sales / d.cost) * 100) / 100 : 0,
    cpa:    d.inquiries > 0 ? Math.round(d.cost / d.inquiries) : 0,
  }))
}

// ── メインコンポーネント ───────────────────────────────────

export function ReportsClient({ storeId, reports, inquiries }: ReportsClientProps) {
  const [tab, setTab] = useState<'chart' | 'input' | 'import'>('chart')

  // データ入力フォーム
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    platform: 'google_ads',
    impressions: '', clicks: '', cost: '', sales: '', inquiries: '', line_adds: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError,   setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState(false)

  // AIインサイト
  const [aiInsight, setAiInsight] = useState<{ headline?: string; comment: string; todos: string[] } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState('')

  // CSVインポート
  const [importPlatform, setImportPlatform] = useState<'google_ads' | 'meta_ads'>('google_ads')
  const [importRows,     setImportRows]     = useState<ImportRow[] | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [importLoading,  setImportLoading]  = useState(false)
  const [importResult,   setImportResult]   = useState<{ imported: number } | null>(null)
  const [importError,    setImportError]    = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── AI ───────────────────────────────────────────────────
  const fetchInsight = async () => {
    setAiLoading(true); setAiError('')
    try {
      const res  = await fetch('/api/ai/insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AIの分析に失敗しました')
      setAiInsight({ headline: data.headline, comment: data.comment, todos: data.todos ?? [] })
    } catch (err: any) {
      setAiError(err.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ── 手動入力 ─────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true); setFormError(''); setFormSuccess(false)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId, date: form.date, platform: form.platform,
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
      setFormSuccess(true)
      setForm(f => ({ ...f, impressions: '', clicks: '', cost: '', sales: '', inquiries: '', line_adds: '' }))
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // ── CSVインポート ────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFileName(file.name)
    setImportResult(null)
    setImportError('')
    setImportRows(null)

    try {
      const text = await file.text()
      const rows = importPlatform === 'google_ads'
        ? parseGoogleAdsCSV(text)
        : parseMetaAdsCSV(text)

      if (rows.length === 0) {
        setImportError('データを読み取れませんでした。CSVの形式を確認してください。')
      } else {
        setImportRows(rows)
      }
    } catch {
      setImportError('ファイルの読み込みに失敗しました')
    }

    // ファイル入力をリセット（同じファイルの再選択を可能にする）
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImport = async () => {
    if (!importRows?.length) return
    setImportLoading(true); setImportError('')
    try {
      const res = await fetch('/api/reports/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, platform: importPlatform, rows: importRows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'インポートに失敗しました')
      setImportResult({ imported: data.imported })
      setImportRows(null)
      setImportFileName('')
    } catch (err: any) {
      setImportError(err.message)
    } finally {
      setImportLoading(false)
    }
  }

  const clearImport = () => {
    setImportRows(null); setImportFileName(''); setImportResult(null); setImportError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── 集計 ─────────────────────────────────────────────────
  const daily  = aggregateByDate(reports)
  const totals = daily.reduce(
    (acc, d) => ({
      cost: acc.cost + d.cost, sales: acc.sales + d.sales,
      clicks: acc.clicks + d.clicks, inquiries: acc.inquiries + d.inquiries,
      line_adds: acc.line_adds + d.line_adds,
    }),
    { cost: 0, sales: 0, clicks: 0, inquiries: 0, line_adds: 0 }
  )
  const totalRoas = totals.cost > 0 ? Math.round((totals.sales / totals.cost) * 100) / 100 : 0
  const totalCpa  = totals.inquiries > 0 ? Math.round(totals.cost / totals.inquiries) : 0

  // ── 手動入力フィールドヘルパー ─────────────────────────
  const inputField = (key: keyof typeof form, label: string, placeholder: string, prefix?: string) => (
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

  // ── レンダリング ──────────────────────────────────────────
  return (
    <div className="min-h-full bg-gray-50/60">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-10 space-y-5">

        {/* ヘッダー + タブ */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-black tracking-tight text-gray-900">数字を見る</h1>
            <p className="text-sm text-gray-400 mt-0.5">過去30日間の広告パフォーマンス</p>
          </div>

          <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
            {([
              { key: 'chart',  label: 'グラフ',     Icon: BarChart3   },
              { key: 'import', label: 'CSV取込',    Icon: Upload       },
              { key: 'input',  label: '手動入力',   Icon: ClipboardList },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all',
                  tab === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════
            グラフタブ
        ════════════════════════════════════════ */}
        {tab === 'chart' && (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '広告費',           value: formatCurrency(totals.cost)  },
                { label: '売上（広告経由）', value: formatCurrency(totals.sales) },
                { label: 'ROAS',             value: `${totalRoas}x`              },
                { label: 'CPA',              value: totalCpa > 0 ? formatCurrency(totalCpa) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{value}</p>
                </div>
              ))}
            </div>

            {/* AIインサイト */}
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
                {aiError && <p className="text-xs text-red-500 mt-1">{aiError}</p>}
                {aiInsight && !aiLoading && (
                  <div className="space-y-3">
                    {aiInsight.headline && (
                      <p className="text-[15px] font-black text-indigo-700 leading-snug">{aiInsight.headline}</p>
                    )}
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
                    <button onClick={fetchInsight} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-600 transition-colors">
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

            {/* グラフ or 空状態 */}
            {daily.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                <BarChart3 className="mx-auto h-9 w-9 text-gray-200 mb-3" />
                <p className="text-sm font-semibold text-gray-400">データがまだありません</p>
                <p className="text-xs text-gray-300 mt-1 mb-4">CSVを取り込むか、手動でデータを入力してください</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setTab('import')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    CSVを取り込む
                  </button>
                  <button
                    onClick={() => setTab('input')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    手動入力
                  </button>
                </div>
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

        {/* ════════════════════════════════════════
            CSVインポートタブ
        ════════════════════════════════════════ */}
        {tab === 'import' && (
          <div className="space-y-4">

            {/* 広告媒体セレクター */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-600 mb-3">広告媒体を選択</p>
              <div className="flex gap-2">
                {([
                  { key: 'google_ads', label: 'Google広告' },
                  { key: 'meta_ads',   label: 'Meta広告（Instagram）' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setImportPlatform(key); clearImport() }}
                    className={cn(
                      'flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all',
                      importPlatform === key
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* CSVエクスポート手順 */}
            <div className="rounded-2xl border border-blue-50 bg-blue-50/60 p-4">
              <p className="text-xs font-bold text-blue-700 mb-2">
                {importPlatform === 'google_ads' ? 'Google広告からのエクスポート手順' : 'Meta広告からのエクスポート手順'}
              </p>
              <p className="text-xs text-blue-600 leading-relaxed">
                {importPlatform === 'google_ads'
                  ? 'Google広告 → レポート → 定義済みレポート → 時間 → 「日」→ エクスポート → CSV'
                  : 'Metaビジネスマネージャー → 広告マネージャー → 右上の「レポート」→ エクスポート → CSV'
                }
              </p>
            </div>

            {/* 成功メッセージ */}
            {importResult && (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    {importResult.imported}日分のデータを取り込みました
                  </p>
                  <button
                    onClick={() => setTab('chart')}
                    className="text-xs text-emerald-600 underline mt-0.5"
                  >
                    グラフで確認する →
                  </button>
                </div>
              </div>
            )}

            {/* ファイルアップロードゾーン */}
            {!importRows && !importResult && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
                    'border-gray-200 bg-white py-12 cursor-pointer',
                    'hover:border-indigo-300 hover:bg-indigo-50/30 transition-all'
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
                    <Upload className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-700">CSVファイルを選択</p>
                    <p className="text-xs text-gray-400 mt-0.5">クリックしてファイルを選択</p>
                  </div>
                </label>

                {importError && (
                  <div className="flex items-start gap-2 mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{importError}</p>
                  </div>
                )}
              </div>
            )}

            {/* プレビュー */}
            {importRows && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* ファイル名ヘッダー */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-bold text-gray-700">{importFileName}</p>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                      {importRows.length}日分
                    </span>
                  </div>
                  <button onClick={clearImport} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* プレビューテーブル */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 font-bold">
                        <th className="px-3 py-2.5 text-left">日付</th>
                        <th className="px-3 py-2.5 text-right">広告費</th>
                        <th className="px-3 py-2.5 text-right">クリック</th>
                        <th className="px-3 py-2.5 text-right">成果</th>
                        <th className="px-3 py-2.5 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {importRows.slice(0, 10).map(row => {
                        const roas = row.cost > 0 ? (row.sales / row.cost).toFixed(1) : '—'
                        return (
                          <tr key={row.date} className="text-gray-700">
                            <td className="px-3 py-2.5 font-medium">{row.date}</td>
                            <td className="px-3 py-2.5 text-right">{formatCurrency(row.cost)}</td>
                            <td className="px-3 py-2.5 text-right">{row.clicks.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right">{row.inquiries}件</td>
                            <td className="px-3 py-2.5 text-right">{roas === '—' ? '—' : `${roas}x`}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {importRows.length > 10 && (
                    <p className="px-3 py-2 text-[11px] text-gray-300 text-center">
                      他 {importRows.length - 10}日分
                    </p>
                  )}
                </div>

                {/* 期間サマリ */}
                <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50">
                  <p className="text-xs text-gray-400">
                    期間: {importRows[0].date} 〜 {importRows[importRows.length - 1].date}
                    合計広告費: {formatCurrency(importRows.reduce((s, r) => s + r.cost, 0))}
                  </p>
                </div>

                {/* エラー */}
                {importError && (
                  <div className="px-4 py-3 border-t border-red-50">
                    <p className="text-xs text-red-600">{importError}</p>
                  </div>
                )}

                {/* 取り込みボタン */}
                <div className="px-4 py-3 border-t border-gray-50 flex gap-2">
                  <button
                    onClick={clearImport}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importLoading}
                    className="flex-[2] rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {importLoading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        取り込み中...
                      </>
                    ) : (
                      `${importRows.length}日分を取り込む →`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            手動入力タブ
        ════════════════════════════════════════ */}
        {tab === 'input' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-gray-900 mb-1">広告データを手動入力</p>
            <p className="text-xs text-gray-400 mb-4">同じ日・同じ媒体のデータは上書きされます</p>

            {formSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 mb-4">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-sm font-semibold text-emerald-700">登録しました</p>
              </div>
            )}
            {formError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4">
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
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
                    <option value="google_ads">Google広告</option>
                    <option value="meta_ads">Meta広告</option>
                    <option value="line_ads">LINE広告</option>
                    <option value="other">その他</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {inputField('impressions', 'インプレッション', '1000')}
                {inputField('clicks',      'クリック数',       '50')}
                {inputField('cost',        '広告費',           '5000',  '¥')}
                {inputField('sales',       '売上',             '15000', '¥')}
                {inputField('inquiries',   'コンバージョン数', '3')}
                {inputField('line_adds',   'LINE登録数',       '10')}
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {formLoading ? '登録中...' : '登録する'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
