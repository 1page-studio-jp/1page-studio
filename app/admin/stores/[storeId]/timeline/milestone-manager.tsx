'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Plus, Trash2, FileText, Users, Megaphone, Tag, Star, MessageSquare, TrendingUp, Zap } from 'lucide-react'

const CATEGORIES = [
  { value: 'lp',      label: 'LP',         icon: FileText },
  { value: 'line',    label: 'LINE',        icon: Users },
  { value: 'ad',      label: '広告',        icon: Megaphone },
  { value: 'coupon',  label: 'クーポン',    icon: Tag },
  { value: 'google',  label: 'Google',      icon: Star },
  { value: 'inquiry', label: '問い合わせ',  icon: MessageSquare },
  { value: 'revenue', label: '売上',        icon: TrendingUp },
  { value: 'other',   label: 'その他',      icon: Zap },
]

const CAT_COLOR: Record<string, string> = {
  lp: 'text-blue-500', line: 'text-emerald-500', ad: 'text-violet-500',
  coupon: 'text-amber-500', google: 'text-orange-500', inquiry: 'text-pink-500',
  revenue: 'text-teal-500', other: 'text-gray-400',
}

type Milestone = {
  id: string; title: string; description: string | null; category: string
  happened_at: string; metric_label: string | null; metric_value: string | null; metric_up: boolean; is_auto: boolean
}

interface Props {
  storeId: string
  initialMilestones: Milestone[]
}

export function MilestoneManager({ storeId, initialMilestones }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', category: 'other',
    happened_at: format(new Date(), 'yyyy-MM-dd'),
    metric_label: '', metric_value: '', metric_up: true,
  })

  const handleSave = async () => {
    if (!form.title || !form.happened_at) return
    setSaving(true)
    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          title: form.title,
          description: form.description || null,
          category: form.category,
          happened_at: form.happened_at,
          metric_label: form.metric_label || null,
          metric_value: form.metric_value || null,
          metric_up: form.metric_up,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setMilestones(prev => [created, ...prev].sort(
          (a, b) => new Date(b.happened_at).getTime() - new Date(a.happened_at).getTime()
        ))
        setForm({ title: '', description: '', category: 'other', happened_at: format(new Date(), 'yyyy-MM-dd'), metric_label: '', metric_value: '', metric_up: true })
        setIsAdding(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このエントリーを削除しますか？')) return
    const res = await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
    if (res.ok) setMilestones(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* 追加ボタン */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          エントリーを追加
        </button>
      )}

      {/* 追加フォーム */}
      {isAdding && (
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">新しいエントリー</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">タイトル <span className="text-destructive">*</span></label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="例: LP を公開しました"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">日付 <span className="text-destructive">*</span></label>
              <input
                type="date"
                value={form.happened_at}
                onChange={e => setForm(p => ({ ...p, happened_at: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">カテゴリ</label>
              <select
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">補足説明（任意）</label>
              <textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="内容の詳細を記入..."
                rows={2}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">指標ラベル（任意）</label>
              <input
                value={form.metric_label}
                onChange={e => setForm(p => ({ ...p, metric_label: e.target.value }))}
                placeholder="例: 問い合わせ"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">数値（任意）</label>
              <div className="flex gap-2">
                <input
                  value={form.metric_value}
                  onChange={e => setForm(p => ({ ...p, metric_value: e.target.value }))}
                  placeholder="例: +18%"
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <select
                  value={form.metric_up ? 'up' : 'down'}
                  onChange={e => setForm(p => ({ ...p, metric_up: e.target.value === 'up' }))}
                  className="rounded-lg border bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="up">↑ 上昇</option>
                  <option value="down">↓ 下降</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.title}
              className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* タイムラインリスト */}
      {milestones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-muted-foreground/20 py-12 text-center">
          <p className="text-sm text-muted-foreground">まだエントリーがありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {milestones.map(m => {
            const cat = CATEGORIES.find(c => c.value === m.category) ?? CATEGORIES[7]
            const Icon = cat.icon
            return (
              <div key={m.id} className="flex items-start gap-4 rounded-2xl border bg-card p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted`}>
                  <Icon className={`h-4 w-4 ${CAT_COLOR[m.category] ?? 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{m.title}</p>
                    {m.metric_value && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.metric_up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {m.metric_value}
                      </span>
                    )}
                    {m.is_auto && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">自動</span>}
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(m.happened_at), 'yyyy年M月d日（E）', { locale: ja })} · {cat.label}
                  </p>
                </div>
                {!m.is_auto && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
