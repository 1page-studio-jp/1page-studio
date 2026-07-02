'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, UserCircle2 } from 'lucide-react'

interface AiCommentBoxProps {
  comment: string
  todos: string[]
  generatedAt: string
  partnerName?: string
}

export function AiCommentBox({ comment, todos, generatedAt, partnerName = '担当パートナー' }: AiCommentBoxProps) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const toggle = (i: number) => setChecked(prev => ({ ...prev, [i]: !prev[i] }))
  const doneCount = Object.values(checked).filter(Boolean).length

  return (
    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
      {/* Partner header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
          <UserCircle2 className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{partnerName}</p>
          <p className="text-[11px] text-gray-400">{generatedAt} 更新</p>
        </div>
      </div>

      {/* Message */}
      <div className="px-6 py-4 border-b border-gray-50">
        <p className="text-sm leading-relaxed text-gray-700">{comment}</p>
      </div>

      {/* Todo checklist */}
      {todos.length > 0 && (
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">パートナー推奨アクション</p>
            <span className="text-xs text-gray-400">{doneCount}/{todos.length} 完了</span>
          </div>
          <div className="space-y-1">
            {todos.map((todo, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-gray-50 active:scale-[0.99]"
              >
                {checked[i]
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  : <Circle className="h-5 w-5 shrink-0 text-gray-200" />
                }
                <span className={`text-sm ${checked[i] ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                  {todo}
                </span>
              </button>
            ))}
          </div>
          {doneCount === todos.length && todos.length > 0 && (
            <p className="text-center text-sm font-medium text-emerald-600 mt-3 pt-3 border-t border-gray-50">
              すべて完了！お疲れ様です 🎉
            </p>
          )}
        </div>
      )}
    </div>
  )
}
