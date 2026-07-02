'use client'

import { useState } from 'react'
import { UserCircle2, Plus, Trash2, CheckCircle2, Loader2, Eye, EyeOff, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Comment {
  id: string
  comment: string
  todos: string[]
  generated_at: string
  is_manual?: boolean
  partner_name?: string
}

interface Props {
  storeId: string
  storeName: string
  comments: Comment[]
}

const MONTHS_JP = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

// Tip templates to help partners write natural comments
const COMMENT_TIPS = [
  '先月より〇〇が増えています。',
  '来月は〇〇を強化するとさらに効果が出そうです。',
  '〇〇の改善をしっかり続けられていますね。',
  '〇〇が好調なので、この調子で続けていきましょう。',
]

export function PartnerCommentEditor({ storeId, storeName, comments: initialComments }: Props) {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showTips, setShowTips] = useState(false)

  const today = new Date()
  const [newYear, setNewYear] = useState(today.getFullYear())
  const [newMonth, setNewMonth] = useState(today.getMonth()) // 0-indexed
  const [newComment, setNewComment] = useState('')
  const [newPartnerName, setNewPartnerName] = useState('担当パートナー')
  const [newTodos, setNewTodos] = useState(['', '', ''])

  const appendTip = (tip: string) => {
    setNewComment(prev => prev ? prev + '\n' + tip : tip)
  }

  const handleSave = async () => {
    if (!newComment.trim()) return

    setSaving(true)
    const todos = newTodos.filter(t => t.trim() !== '')
    const generatedAt = new Date(newYear, newMonth, 1).toISOString()

    const { data, error } = await supabase
      .from('ai_comments')
      .upsert({
        store_id: storeId,
        comment: newComment.trim(),
        todos,
        generated_at: generatedAt,
        partner_name: newPartnerName,
        is_manual: true,
      }, {
        onConflict: 'store_id,generated_at',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    setSaving(false)

    if (!error && data) {
      setComments(prev => [data, ...prev.filter(c => c.generated_at.slice(0, 7) !== generatedAt.slice(0, 7))])
      setIsAdding(false)
      setNewComment('')
      setNewTodos(['', '', ''])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このコメントを削除しますか？')) return
    await supabase.from('ai_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const years = [today.getFullYear() - 1, today.getFullYear()]

  return (
    <div className="space-y-5">
      {/* Add new button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />
          今月のコメントを作成
        </button>
      )}

      {/* New comment form */}
      {isAdding && (
        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-indigo-900">新しいパートナーコメント</h3>
            <button
              onClick={() => setIsAdding(false)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              キャンセル
            </button>
          </div>

          {/* Period + partner name */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">対象月</label>
              <div className="flex gap-2">
                <select
                  value={newYear}
                  onChange={e => setNewYear(Number(e.target.value))}
                  className="rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  {years.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select
                  value={newMonth}
                  onChange={e => setNewMonth(Number(e.target.value))}
                  className="rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  {MONTHS_JP.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">担当者名</label>
              <input
                value={newPartnerName}
                onChange={e => setNewPartnerName(e.target.value)}
                className="rounded-lg border bg-white px-3 py-2 text-sm w-40"
                placeholder="担当パートナー"
              />
            </div>
          </div>

          {/* Comment textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                コメント本文
                <span className="ml-1.5 text-indigo-600">（自然な言葉で書いてください）</span>
              </label>
              <button
                onClick={() => setShowTips(!showTips)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                {showTips ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                文例を{showTips ? '隠す' : '見る'}
              </button>
            </div>
            {showTips && (
              <div className="mb-2 flex flex-wrap gap-2">
                {COMMENT_TIPS.map((tip, i) => (
                  <button
                    key={i}
                    onClick={() => appendTip(tip)}
                    className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-50 transition"
                  >
                    + {tip}
                  </button>
                ))}
              </div>
            )}
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={4}
              placeholder={`例）先月よりLINE登録が増えています。来月は口コミ強化がおすすめです。\nGoogle口コミへの返信を丁寧に続けていただいているので、信頼感が上がっています。`}
              className="w-full rounded-xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              💡 AIっぽい言葉（「データ分析によると」「最適化」「KPI」など）は使わず、人間らしい言葉で書きましょう
            </p>
          </div>

          {/* Today's todos */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              おすすめアクション（最大3件）
            </label>
            <div className="space-y-2">
              {newTodos.map((todo, i) => (
                <input
                  key={i}
                  value={todo}
                  onChange={e => setNewTodos(prev => prev.map((t, j) => j === i ? e.target.value : t))}
                  placeholder={['Googleマップの口コミに返信する', 'LINEで今週のメッセージを送る', 'クーポンの期限を確認する'][i]}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          {newComment && (
            <div className="rounded-xl bg-white border border-indigo-100 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">プレビュー（オーナー画面）</p>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <UserCircle2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-800">{newPartnerName}</p>
                  <p className="text-xs text-muted-foreground">{newYear}年{newMonth + 1}月のコメント</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground whitespace-pre-line">{newComment}</p>
                  {newTodos.filter(t => t.trim()).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {newTodos.filter(t => t.trim()).map((todo, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                          <span>{todo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !newComment.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            保存してオーナーに表示
          </button>
        </div>
      )}

      {/* Existing comments */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">過去のコメント</h3>
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">まだコメントがありません</p>
        )}
        {comments.map(c => {
          const d = new Date(c.generated_at)
          const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                    <UserCircle2 className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{c.partner_name || '担当パートナー'}</p>
                      <span className="text-xs text-muted-foreground">{label}</span>
                      {c.is_manual && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          手動入力
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-foreground leading-relaxed whitespace-pre-line line-clamp-3">
                      {c.comment}
                    </p>
                    {c.todos?.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        おすすめ: {c.todos.join('、')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
