'use client'

import { useState } from 'react'
import { Sparkles, ChevronRight, RefreshCw } from 'lucide-react'

interface InsightData {
  headline: string
  comment: string
  todos: string[]
}

interface Props {
  storeId: string
}

export function AiHomeInsight({ storeId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [data, setData] = useState<InsightData | null>(null)
  const [errMsg, setErrMsg] = useState('')

  const run = async () => {
    setState('loading')
    setErrMsg('')
    try {
      const res  = await fetch('/api/ai/insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ store_id: storeId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'エラーが発生しました')
      setData({ headline: json.headline ?? '', comment: json.comment ?? '', todos: json.todos ?? [] })
      setState('done')
    } catch (e: any) {
      setErrMsg(e.message)
      setState('error')
    }
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 text-white shadow-lg shadow-indigo-100">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-black tracking-wide">AIアドバイス</p>
        </div>
        {state === 'done' && (
          <button
            onClick={run}
            className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold hover:bg-white/25 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            再分析
          </button>
        )}
      </div>

      {/* アイドル */}
      {state === 'idle' && (
        <>
          <p className="text-sm text-indigo-200 mb-4 leading-relaxed">
            今月の広告データをAIが分析して、<br />今週やるべきことを教えてくれます。
          </p>
          <button
            onClick={run}
            className="flex w-full items-center justify-between rounded-xl bg-white/20 px-4 py-3 text-sm font-bold hover:bg-white/30 transition-colors"
          >
            今週の戦略を聞く
            <ChevronRight className="h-4 w-4 opacity-70" />
          </button>
        </>
      )}

      {/* ローディング */}
      {state === 'loading' && (
        <div className="flex items-center gap-3 py-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-white" />
          <p className="text-sm text-indigo-200">データを分析中...</p>
        </div>
      )}

      {/* エラー */}
      {state === 'error' && (
        <div className="space-y-3">
          <p className="text-sm text-indigo-200">{errMsg}</p>
          <button onClick={run} className="text-xs font-bold text-indigo-300 hover:text-white transition-colors">
            再試行する
          </button>
        </div>
      )}

      {/* 結果 */}
      {state === 'done' && data && (
        <div className="space-y-3">
          {data.headline && (
            <p className="text-[15px] font-black leading-snug">{data.headline}</p>
          )}
          <p className="text-sm text-indigo-100 leading-relaxed">{data.comment}</p>
          {data.todos.length > 0 && (
            <div className="space-y-2 pt-1">
              {data.todos.map((todo, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-[11px] font-black">
                    {i + 1}
                  </span>
                  <p className="text-sm text-indigo-100 leading-snug">{todo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
