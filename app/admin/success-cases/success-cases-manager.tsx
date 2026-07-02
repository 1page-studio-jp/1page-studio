'use client'

import { useState } from 'react'
import { Plus, Star, StarOff, Pencil, Trash2, BookOpen, X, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { INDUSTRIES } from '@/lib/lp-templates'
import { cn } from '@/lib/utils'

const CASE_TYPES = [
  { id: 'lp',           label: 'LP',             color: 'bg-blue-100 text-blue-700',    emoji: '🖥️' },
  { id: 'coupon',       label: 'クーポン',        color: 'bg-amber-100 text-amber-700',  emoji: '🎟️' },
  { id: 'ad_copy',      label: '広告文',          color: 'bg-violet-100 text-violet-700', emoji: '📣' },
  { id: 'line_message', label: 'LINEメッセージ',  color: 'bg-emerald-100 text-emerald-700', emoji: '💬' },
]

interface SuccessCase {
  id: string
  industry_id: string
  case_type: string
  title: string
  result_summary: string
  result_metric?: string
  content: string
  tags: string[]
  is_featured: boolean
  view_count: number
  created_at: string
}

interface Props {
  cases: SuccessCase[]
}

const EMPTY_FORM = {
  industry_id: 'salon',
  case_type: 'lp',
  title: '',
  result_summary: '',
  result_metric: '',
  content: '',
  tags: '',
  is_featured: false,
}

export function SuccessCasesManager({ cases: initialCases }: Props) {
  const supabase = createClient()
  const [cases, setCases] = useState(initialCases)
  const [filter, setFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SuccessCase | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const f = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  const filteredCases = cases.filter(c => {
    if (filter && c.industry_id !== filter) return false
    if (typeFilter && c.case_type !== typeFilter) return false
    return true
  })

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (c: SuccessCase) => {
    setEditing(c)
    setForm({
      industry_id: c.industry_id,
      case_type: c.case_type,
      title: c.title,
      result_summary: c.result_summary,
      result_metric: c.result_metric || '',
      content: c.content,
      tags: c.tags.join(', '),
      is_featured: c.is_featured,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const payload = {
      industry_id: form.industry_id,
      case_type: form.case_type,
      title: form.title,
      result_summary: form.result_summary,
      result_metric: form.result_metric || null,
      content: form.content,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      is_featured: form.is_featured,
    }

    if (editing) {
      const { data } = await supabase.from('success_cases').update(payload).eq('id', editing.id).select().single()
      if (data) setCases(prev => prev.map(c => c.id === editing.id ? data : c))
    } else {
      const { data } = await supabase.from('success_cases').insert(payload).select().single()
      if (data) setCases(prev => [data, ...prev])
    }
    setSaving(false)
    setShowForm(false)
  }

  const handleFeatureToggle = async (c: SuccessCase) => {
    const { data } = await supabase
      .from('success_cases')
      .update({ is_featured: !c.is_featured })
      .eq('id', c.id)
      .select()
      .single()
    if (data) setCases(prev => prev.map(x => x.id === c.id ? data : x))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この事例を削除しますか？')) return
    await supabase.from('success_cases').delete().eq('id', id)
    setCases(prev => prev.filter(c => c.id !== id))
  }

  const getTypeInfo = (id: string) => CASE_TYPES.find(t => t.id === id) ?? CASE_TYPES[0]
  const getIndustryInfo = (id: string) => INDUSTRIES.find(i => i.id === id)

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" />事例を追加
        </button>

        {/* Industry filter */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
              !filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200',
            )}
          >全業種</button>
          {INDUSTRIES.map(ind => (
            <button
              key={ind.id}
              onClick={() => setFilter(ind.id === filter ? null : ind.id)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                filter === ind.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200',
              )}
            >
              {ind.emoji} {ind.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          {CASE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(typeFilter === t.id ? null : t.id)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                typeFilter === t.id ? cn(t.color, 'ring-1 ring-current') : 'bg-slate-50 text-muted-foreground hover:bg-slate-100',
              )}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-sm text-muted-foreground">{filteredCases.length}件</span>
      </div>

      {/* Cases grid */}
      <div className="grid gap-4">
        {filteredCases.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">まだ事例がありません</p>
            <p className="text-xs text-muted-foreground/60 mt-1">「事例を追加」ボタンで最初の成功事例を登録しましょう</p>
          </div>
        ) : (
          filteredCases.map(c => {
            const typeInfo = getTypeInfo(c.case_type)
            const industryInfo = getIndustryInfo(c.industry_id)
            const isExpanded = expanded === c.id
            return (
              <div key={c.id} className={cn(
                'rounded-2xl border bg-card shadow-sm overflow-hidden',
                c.is_featured && 'border-amber-300',
              )}>
                <div className="flex items-start gap-3 px-5 py-4">
                  <div className="text-2xl">{typeInfo.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                      {industryInfo && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {industryInfo.emoji} {industryInfo.label}
                        </span>
                      )}
                      {c.is_featured && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          ⭐ おすすめ
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.result_summary}</p>
                    {c.result_metric && (
                      <p className="text-xs font-semibold text-emerald-600 mt-1">📈 {c.result_metric}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleFeatureToggle(c)}
                      className={cn(
                        'rounded-lg p-1.5 transition',
                        c.is_featured ? 'text-amber-500 hover:bg-amber-50' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-50',
                      )}
                      title={c.is_featured ? 'おすすめ解除' : 'おすすめに設定'}
                    >
                      {c.is_featured ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expand content */}
                <div className="border-t">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    className="w-full px-5 py-2 text-xs text-muted-foreground hover:bg-accent transition text-left flex items-center gap-1"
                  >
                    {isExpanded ? '▲ コンテンツを閉じる' : '▼ コンテンツを見る'}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4">
                      <pre className="whitespace-pre-wrap text-xs bg-slate-50 rounded-xl p-3 leading-relaxed font-sans">
                        {c.content}
                      </pre>
                      {c.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {c.tags.map((tag, i) => (
                            <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 px-6 py-4 border-b">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold">{editing ? '事例を編集' : '新しい成功事例を追加'}</h2>
              <button onClick={() => setShowForm(false)} className="ml-auto rounded-lg p-1.5 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">業種</label>
                  <select
                    value={form.industry_id}
                    onChange={e => f('industry_id', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    {INDUSTRIES.map(i => (
                      <option key={i.id} value={i.id}>{i.emoji} {i.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">種類</label>
                  <select
                    value={form.case_type}
                    onChange={e => f('case_type', e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    {CASE_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">タイトル *</label>
                <input
                  value={form.title}
                  onChange={e => f('title', e.target.value)}
                  placeholder="例：初回20%OFFクーポンでLINE登録2.4倍"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">結果サマリー *</label>
                <textarea
                  value={form.result_summary}
                  onChange={e => f('result_summary', e.target.value)}
                  rows={2}
                  placeholder="例：クーポン内容を変更したところ、LINE登録率が大きく向上した"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">数値実績</label>
                <input
                  value={form.result_metric}
                  onChange={e => f('result_metric', e.target.value)}
                  placeholder="例：LINE登録率 8% → 19%"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">コンテンツ本体 *</label>
                <textarea
                  value={form.content}
                  onChange={e => f('content', e.target.value)}
                  rows={6}
                  placeholder="LP・クーポン・広告文・LINEメッセージの実際の内容を貼り付けてください"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">タグ（カンマ区切り）</label>
                <input
                  value={form.tags}
                  onChange={e => f('tags', e.target.value)}
                  placeholder="例：クーポン, LINE登録, 美容室"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={e => f('is_featured', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">⭐ おすすめ事例として目立たせる</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.title || !form.result_summary || !form.content}
                className="flex items-center gap-2 flex-1 justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editing ? '更新する' : '追加する'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
