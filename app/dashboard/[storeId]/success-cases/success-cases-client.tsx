'use client'

import { useState } from 'react'
import { Star, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { INDUSTRIES } from '@/lib/lp-templates'
import { cn } from '@/lib/utils'

const CASE_TYPES = [
  { id: 'lp',           label: 'LP',             color: 'bg-blue-100 text-blue-700',     emoji: '🖥️' },
  { id: 'coupon',       label: 'クーポン',        color: 'bg-amber-100 text-amber-700',   emoji: '🎟️' },
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
}

interface Props {
  cases: SuccessCase[]
  storeName: string
}

export function SuccessCasesClient({ cases, storeName }: Props) {
  const [industryFilter, setIndustryFilter] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = cases.filter(c => {
    if (industryFilter && c.industry_id !== industryFilter) return false
    if (typeFilter && c.case_type !== typeFilter) return false
    return true
  })

  const getTypeInfo = (id: string) => CASE_TYPES.find(t => t.id === id) ?? CASE_TYPES[0]
  const getIndustryInfo = (id: string) => INDUSTRIES.find(i => i.id === id)

  const handleCopy = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setIndustryFilter(null)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition',
              !industryFilter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200',
            )}
          >全業種</button>
          {INDUSTRIES.map(ind => (
            <button
              key={ind.id}
              onClick={() => setIndustryFilter(ind.id === industryFilter ? null : ind.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                industryFilter === ind.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200',
              )}
            >
              {ind.emoji} {ind.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CASE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(typeFilter === t.id ? null : t.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                typeFilter === t.id ? cn(t.color, 'ring-1 ring-current') : 'bg-slate-50 text-muted-foreground hover:bg-slate-100',
              )}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length}件の事例</p>

      {/* Case cards */}
      <div className="grid gap-3">
        {filtered.map(c => {
          const typeInfo = getTypeInfo(c.case_type)
          const industryInfo = getIndustryInfo(c.industry_id)
          const isExpanded = expanded === c.id

          return (
            <div
              key={c.id}
              className={cn(
                'rounded-2xl border bg-card shadow-sm overflow-hidden',
                c.is_featured && 'border-amber-300 bg-amber-50/20',
              )}
            >
              <div className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{typeInfo.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                      {industryInfo && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {industryInfo.emoji} {industryInfo.label}
                        </span>
                      )}
                      {c.is_featured && (
                        <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Star className="h-2.5 w-2.5 fill-current" />パートナーおすすめ
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold leading-snug">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{c.result_summary}</p>
                    {c.result_metric && (
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 mt-2">
                        <span className="text-emerald-600 text-xs font-bold">📈 {c.result_metric}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expand button */}
              <div className="border-t">
                <button
                  onClick={() => setExpanded(isExpanded ? null : c.id)}
                  className="flex w-full items-center justify-between px-5 py-2.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition"
                >
                  <span>{isExpanded ? 'コンテンツを閉じる' : 'コンテンツを見る → 参考にする'}</span>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 bg-white border-t border-indigo-50">
                    <div className="relative mt-3">
                      <pre className="whitespace-pre-wrap text-sm bg-slate-50 rounded-xl p-4 leading-relaxed font-sans border pr-12">
                        {c.content}
                      </pre>
                      <button
                        onClick={() => handleCopy(c.id, c.content)}
                        className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-white border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-indigo-300 transition shadow-sm"
                      >
                        {copied === c.id ? (
                          <><Check className="h-3.5 w-3.5 text-emerald-500" />コピー済み</>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" />コピー</>
                        )}
                      </button>
                    </div>

                    {c.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-3">
                        {c.tags.map((tag, i) => (
                          <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-3 bg-slate-50 rounded-lg px-3 py-2">
                      💡 このコンテンツをそのまま使うのではなく、{storeName}の特色に合わせてアレンジしてご利用ください。担当パートナーがサポートします。
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">この条件の成功事例はまだありません</p>
            <p className="text-xs text-muted-foreground/60 mt-1">担当パートナーが順次追加していきます</p>
          </div>
        )}
      </div>
    </div>
  )
}
