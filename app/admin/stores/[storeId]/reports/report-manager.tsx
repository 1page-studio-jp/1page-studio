'use client'

import { useState } from 'react'
import { FileDown, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'

interface ReportManagerProps {
  storeId: string
  storeName: string
}

const CURRENT_YEAR = new Date().getFullYear()
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

type Status = 'idle' | 'loading' | 'success' | 'error'

export function ReportManager({ storeId, storeName }: ReportManagerProps) {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(new Date().getMonth()) // 0-indexed
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleGenerate = async () => {
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/reports/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, year, month: month + 1 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Unknown error')
      }

      // Download the PDF
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Get filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename\*=UTF-8''(.+)/)
      a.download = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : `1PageStudio_${storeName}_${year}年${month + 1}月レポート.pdf`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      setStatus('error')
      setErrorMsg(err.message)
    }
  }

  const years = [CURRENT_YEAR - 1, CURRENT_YEAR]

  return (
    <div className="space-y-6">
      {/* Monthly report card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">月次レポートPDF生成</h2>
            <p className="text-sm text-muted-foreground">売上・問い合わせ・LINE登録・広告結果をまとめた営業資料クオリティのPDFを生成します</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">年</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">月</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          <div className="self-end">
            <p className="text-xs text-muted-foreground mb-1.5">
              対象期間: {year}年{month + 1}月
            </p>
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={status === 'loading'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              PDF生成中...（20〜30秒かかります）
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              {year}年{month + 1}月のレポートPDFを生成・ダウンロード
            </>
          )}
        </button>

        {/* Status messages */}
        {status === 'success' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            PDFのダウンロードが完了しました
          </div>
        )}
        {status === 'error' && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">PDF生成に失敗しました</p>
              {errorMsg && <p className="mt-0.5 text-xs opacity-80">{errorMsg}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Content preview card */}
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold mb-4">PDFレポートの内容</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { num: '①', title: '今月の成果', desc: '売上・問い合わせ・LINE登録・LP閲覧数の4指標' },
            { num: '②', title: '先月との成長グラフ', desc: '視覚的な棒グラフで成長を一目で確認' },
            { num: '③', title: '広告結果', desc: '広告費・クリック・表示回数・費用対効果' },
            { num: '④', title: '今月の改善内容', desc: 'タイムラインから自動取得' },
            { num: '⑤', title: '担当パートナーからのコメント', desc: 'AI感ゼロの個人的なメッセージ' },
            { num: '⑥', title: '来月の提案', desc: '具体的なアクションリスト' },
          ].map(item => (
            <div key={item.num} className="flex gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {item.num}
              </span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-generation notice */}
      <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
        <p className="text-sm text-indigo-700 font-medium">💡 自動生成スケジュール</p>
        <p className="text-xs text-indigo-600 mt-1">
          毎月末日の深夜0時に全店舗のレポートが自動生成され、担当パートナーにメール通知されます。
          ここから手動でいつでも再生成・ダウンロードできます。
        </p>
      </div>
    </div>
  )
}
