'use client'

import { useState } from 'react'
import { MessageSquare, Phone, Mail, CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Inquiry {
  id: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  message: string | null
  source: string | null
  status: string
  created_at: string
}

interface InquiriesClientProps {
  storeId: string
  initialInquiries: Inquiry[]
}

const tabs = [
  { key: 'new', label: '未対応', icon: Clock },
  { key: 'contacted', label: '対応済み', icon: CheckCircle2 },
  { key: 'all', label: 'すべて', icon: MessageSquare },
] as const

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: '未対応', color: 'text-orange-600', bg: 'bg-orange-100' },
  contacted: { label: '対応済み', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  reserved: { label: '予約済み', color: 'text-blue-600', bg: 'bg-blue-100' },
  closed: { label: '完了', color: 'text-muted-foreground', bg: 'bg-muted' },
  canceled: { label: 'キャンセル', color: 'text-muted-foreground', bg: 'bg-muted' },
}

const sourceLabel: Record<string, string> = {
  lp: 'LP経由',
  line: 'LINE',
  phone: '電話',
  walk_in: '来店',
  other: 'その他',
}

export function InquiriesClient({ storeId, initialInquiries }: InquiriesClientProps) {
  const [inquiries, setInquiries] = useState(initialInquiries)
  const [activeTab, setActiveTab] = useState<'new' | 'contacted' | 'all'>('new')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = inquiries.filter(inq => {
    if (activeTab === 'all') return true
    if (activeTab === 'new') return inq.status === 'new'
    if (activeTab === 'contacted') return ['contacted', 'reserved', 'closed'].includes(inq.status)
    return true
  })

  const newCount = inquiries.filter(i => i.status === 'new').length

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status } : inq))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">お問い合わせ</h1>
          <p className="text-muted-foreground mt-1">
            全 {inquiries.length} 件
            {newCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-orange-600 font-medium">
                · <Clock className="h-3.5 w-3.5" /> 未対応 {newCount}件
              </span>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4 w-fit">
          {tabs.map(({ key, label, icon: Icon }) => {
            const count = key === 'new' ? newCount : key === 'all' ? inquiries.length : inquiries.filter(i => ['contacted', 'reserved', 'closed'].includes(i.status)).length
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  activeTab === key
                    ? 'bg-white shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                    key === 'new' ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/20 bg-card py-16 text-center">
            <MessageSquare className="mx-auto h-9 w-9 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {activeTab === 'new' ? '未対応のお問い合わせはありません 👍' : 'お問い合わせはありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(inq => {
              const cfg = statusConfig[inq.status] ?? statusConfig.closed
              const isExpanded = expandedId === inq.id
              const isUpdating = updatingId === inq.id

              return (
                <div
                  key={inq.id}
                  className={cn(
                    'rounded-2xl border bg-card overflow-hidden transition-all',
                    inq.status === 'new' && 'border-orange-200 shadow-sm shadow-orange-50'
                  )}
                >
                  {/* Main row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                    className="flex w-full items-start gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                      inq.status === 'new' ? 'bg-orange-100 text-orange-600' : 'bg-muted text-muted-foreground'
                    )}>
                      {(inq.customer_name ?? '?').charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{inq.customer_name ?? '匿名のお客様'}</span>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                          {cfg.label}
                        </span>
                        {inq.source && (
                          <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                            {sourceLabel[inq.source] ?? inq.source}
                          </span>
                        )}
                      </div>
                      {inq.message && (
                        <p className={cn(
                          'text-sm text-muted-foreground mt-1 leading-relaxed',
                          !isExpanded && 'line-clamp-1'
                        )}>
                          {inq.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(inq.created_at), 'M月d日（E） HH:mm', { locale: ja })}
                      </p>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t bg-muted/20 px-4 py-4">
                      <div className="space-y-2 mb-4">
                        {inq.customer_phone && (
                          <a
                            href={`tel:${inq.customer_phone}`}
                            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                          >
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {inq.customer_phone}
                          </a>
                        )}
                        {inq.customer_email && (
                          <a
                            href={`mailto:${inq.customer_email}`}
                            className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                          >
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {inq.customer_email}
                          </a>
                        )}
                        {inq.message && (
                          <div className="rounded-xl bg-card border p-3 mt-2">
                            <p className="text-xs text-muted-foreground mb-1">メッセージ</p>
                            <p className="text-sm leading-relaxed">{inq.message}</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {inq.status === 'new' && (
                          <button
                            onClick={() => updateStatus(inq.id, 'contacted')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 text-white text-xs font-medium px-3 py-2 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isUpdating ? '更新中...' : '対応済みにする'}
                          </button>
                        )}
                        {inq.status === 'new' && (
                          <button
                            onClick={() => updateStatus(inq.id, 'reserved')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 rounded-xl bg-blue-500 text-white text-xs font-medium px-3 py-2 hover:bg-blue-600 disabled:opacity-50 transition-colors"
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            予約済みにする
                          </button>
                        )}
                        {['contacted', 'reserved'].includes(inq.status) && (
                          <button
                            onClick={() => updateStatus(inq.id, 'closed')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium px-3 py-2 hover:bg-muted/80 disabled:opacity-50 transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            完了にする
                          </button>
                        )}
                        {inq.status !== 'new' && (
                          <button
                            onClick={() => updateStatus(inq.id, 'new')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 rounded-xl border text-xs font-medium px-3 py-2 hover:bg-muted disabled:opacity-50 transition-colors text-muted-foreground"
                          >
                            未対応に戻す
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
