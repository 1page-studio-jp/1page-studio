'use client'

import { useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { AnalysisCard } from '@/components/dashboard/analysis-card'
import { createClient } from '@/lib/supabase/client'

interface Props {
  storeId: string
  storeName: string
  analyses: any[]
}

export function AnalysisManager({ storeId, storeName, analyses: initialAnalyses }: Props) {
  const supabase = createClient()
  const [analyses, setAnalyses] = useState(initialAnalyses)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Replace today's analysis if exists, or prepend
      setAnalyses(prev => {
        const today = data.analysis.analysis_date
        const filtered = prev.filter((a: any) => a.analysis_date !== today)
        return [data.analysis, ...filtered].slice(0, 10)
      })
    } catch (e: any) {
      setError(e.message)
    }
    setGenerating(false)
  }

  const handleUpdate = async (analysisId: string, updates: any) => {
    const { data } = await supabase
      .from('store_analyses')
      .update({ ...updates, edited_at: new Date().toISOString() })
      .eq('id', analysisId)
      .select()
      .single()
    if (data) {
      setAnalyses(prev => prev.map((a: any) => a.id === analysisId ? data : a))
    }
  }

  return (
    <div className="space-y-5">
      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />分析生成中...</>
          ) : (
            <><Sparkles className="h-4 w-4" />今日の分析を生成</>
          )}
        </button>
        <p className="text-xs text-muted-foreground">
          AIが現在のデータを分析して強み・弱み・改善提案を自動生成します
        </p>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {/* Analysis list */}
      <div className="space-y-4">
        {analyses.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-12 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">まだ分析がありません</p>
            <p className="text-xs text-muted-foreground/60 mt-1">「今日の分析を生成」ボタンで初回生成できます</p>
          </div>
        ) : (
          analyses.map((a: any) => (
            <AnalysisCard
              key={a.id}
              analysis={a}
              isAdmin={true}
              onUpdate={(updates) => handleUpdate(a.id, updates)}
            />
          ))
        )}
      </div>
    </div>
  )
}
