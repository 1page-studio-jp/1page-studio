'use client'

import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Lightbulb, ListOrdered,
  ChevronDown, ChevronUp, Pencil, Check, X, Loader2,
  Sparkles, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Suggestion {
  text: string
  category: 'lp' | 'line' | 'ad' | 'coupon' | 'google' | 'general'
  priority_rank: number
}

interface Analysis {
  id: string
  analysis_date: string
  strengths: string[]
  weaknesses: string[]
  suggestions: Suggestion[]
  priorities: string[]
  is_partner_edited: boolean
  partner_note?: string
  ai_generated_at: string
}

interface AnalysisCardProps {
  analysis: Analysis
  isAdmin?: boolean
  onUpdate?: (updated: Partial<Analysis>) => Promise<void>
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  lp:      { label: 'LP',     color: 'bg-blue-100 text-blue-700' },
  line:    { label: 'LINE',   color: 'bg-emerald-100 text-emerald-700' },
  ad:      { label: '広告',   color: 'bg-violet-100 text-violet-700' },
  coupon:  { label: 'クーポン', color: 'bg-amber-100 text-amber-700' },
  google:  { label: 'Google', color: 'bg-orange-100 text-orange-700' },
  general: { label: '全般',   color: 'bg-slate-100 text-slate-700' },
}

function SectionHeader({
  icon: Icon,
  label,
  color,
  count,
}: {
  icon: React.ElementType
  label: string
  color: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-bold">{label}</span>
      {count != null && (
        <span className="ml-auto text-xs text-muted-foreground">{count}件</span>
      )}
    </div>
  )
}

// Inline editable text list
function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const handleChange = (i: number, value: string) => {
    const next = [...items]
    next[i] = value
    onChange(next)
  }
  const handleAdd = () => onChange([...items, ''])
  const handleRemove = (i: number) => onChange(items.filter((_, j) => j !== i))

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={e => handleChange(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={() => handleRemove(i)}
            className="rounded-lg p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={handleAdd}
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
      >
        + 追加
      </button>
    </div>
  )
}

export function AnalysisCard({ analysis, isAdmin = false, onUpdate }: AnalysisCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Editable copies
  const [editStrengths, setEditStrengths] = useState(analysis.strengths)
  const [editWeaknesses, setEditWeaknesses] = useState(analysis.weaknesses)
  const [editPriorities, setEditPriorities] = useState(analysis.priorities)
  const [editNote, setEditNote] = useState(analysis.partner_note || '')

  const date = new Date(analysis.analysis_date)
  const dateLabel = `${date.getMonth() + 1}月${date.getDate()}日`

  const handleSave = async () => {
    if (!onUpdate) return
    setSaving(true)
    await onUpdate({
      strengths: editStrengths.filter(Boolean),
      weaknesses: editWeaknesses.filter(Boolean),
      priorities: editPriorities.filter(Boolean),
      partner_note: editNote,
      is_partner_edited: true,
    })
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditStrengths(analysis.strengths)
    setEditWeaknesses(analysis.weaknesses)
    setEditPriorities(analysis.priorities)
    setEditNote(analysis.partner_note || '')
    setEditing(false)
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
          <Sparkles className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">AI 自動分析レポート</p>
          <p className="text-[11px] text-muted-foreground">{dateLabel}更新</p>
        </div>
        <div className="flex items-center gap-2">
          {analysis.is_partner_edited && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              パートナー編集済
            </span>
          )}
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {isAdmin && editing && (
            <div className="flex gap-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                保存
              </button>
              <button
                onClick={handleCancel}
                className="rounded-lg border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ① 優先アクション (always visible) */}
        <div>
          <SectionHeader icon={ListOrdered} label="今すぐやること（優先順位）" color="bg-indigo-100 text-indigo-600" />
          {editing ? (
            <EditableList
              items={editPriorities}
              onChange={setEditPriorities}
              placeholder="優先アクション..."
            />
          ) : (
            <ol className="space-y-2">
              {analysis.priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-snug">{p}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-xs text-muted-foreground hover:bg-accent transition"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> 詳細を閉じる</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> 強み・弱み・改善提案を見る</>
          )}
        </button>

        {expanded && (
          <div className="space-y-5">
            {/* ② 強み */}
            <div>
              <SectionHeader
                icon={TrendingUp}
                label="強み"
                color="bg-emerald-100 text-emerald-600"
                count={editing ? editStrengths.length : analysis.strengths.length}
              />
              {editing ? (
                <EditableList
                  items={editStrengths}
                  onChange={setEditStrengths}
                  placeholder="強みを入力..."
                />
              ) : (
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Star className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                      <span className="text-sm leading-snug text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ③ 弱み */}
            <div>
              <SectionHeader
                icon={TrendingDown}
                label="改善が必要な点"
                color="bg-orange-100 text-orange-600"
                count={editing ? editWeaknesses.length : analysis.weaknesses.length}
              />
              {editing ? (
                <EditableList
                  items={editWeaknesses}
                  onChange={setEditWeaknesses}
                  placeholder="改善点を入力..."
                />
              ) : (
                <ul className="space-y-2">
                  {analysis.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-orange-400 mt-0.5" />
                      <span className="text-sm leading-snug text-foreground">{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ④ 改善提案 */}
            <div>
              <SectionHeader icon={Lightbulb} label="改善提案" color="bg-amber-100 text-amber-600" />
              <div className="space-y-2">
                {analysis.suggestions
                  .sort((a, b) => a.priority_rank - b.priority_rank)
                  .map((s, i) => {
                    const cat = CATEGORY_LABELS[s.category] ?? CATEGORY_LABELS.general
                    return (
                      <div key={i} className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', cat.color)}>
                          {cat.label}
                        </span>
                        <span className="text-sm leading-snug">{s.text}</span>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Partner note (admin only) */}
            {isAdmin && (
              <div>
                <SectionHeader icon={Pencil} label="パートナーメモ（オーナーには非表示）" color="bg-slate-100 text-slate-600" />
                {editing ? (
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    rows={3}
                    placeholder="担当パートナーのメモ（オーナーには表示されません）"
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                ) : (
                  analysis.partner_note ? (
                    <p className="text-sm text-muted-foreground bg-slate-50 rounded-xl px-3 py-2.5">
                      {analysis.partner_note}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">メモなし</p>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
