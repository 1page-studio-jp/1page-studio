'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Comment {
  id: string
  content: string
  todos: string[]
  generated_at: string
  approved: boolean
}

export function AiCommentApproval({ comment }: { comment: Comment }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  if (dismissed) return null

  const approve = async () => {
    setLoading(true)
    await fetch('/api/ai/suggestions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: comment.id }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-start justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-xs text-muted-foreground mb-1">
            {format(new Date(comment.generated_at), 'M月d日 HH:mm', { locale: ja })} 生成
          </p>
          <p className="text-sm line-clamp-2">{comment.content}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

          {comment.todos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">今日やること</p>
              <ul className="space-y-1">
                {comment.todos.map((todo, i) => (
                  <li key={i} className="text-xs flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {todo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={approve} disabled={loading} className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              {loading ? '承認中...' : '承認して店舗へ公開'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              却下
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
