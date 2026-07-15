'use client'

import { useState } from 'react'
import { MessageSquare, Phone, Mail, CheckCircle2, Clock, XCircle, Calendar, ArrowRight } from 'lucide-react'
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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    new:       { label: '未対応',   color: 'text-orange-700', bg: 'bg-orange-50'  },
    contacted: { label: '対応済み', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    reserved:  { label: '予約済み', color: 'text-blue-700',    bg: 'bg-blue-50'    },
    closed:    { label: '完了',     color: 'text-gray-500',    bg: 'bg-gray-100'   },
    canceled:  { label: 'キャンセル', color: 'text-gray-500',  bg: 'bg-gray-100'   },
}

const sourceLabel: Record<string, string> = {
    lp: 'LP経由', line: 'LINE', phone: '電話', walk_in: '来店', other: 'その他',
}

type TabKey = 'new' | 'contacted' | 'all'

export function InquiriesClient({ storeId, initialInquiries }: InquiriesClientProps) {
    const [inquiries, setInquiries] = useState(initialInquiries)
    const [activeTab, setActiveTab] = useState<TabKey>('new')
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

  const newCount = inquiries.filter(i => i.status === 'new').length
    const doneCount = inquiries.filter(i => ['contacted', 'reserved', 'closed'].includes(i.status)).length

  const filtered = inquiries.filter(inq => {
        if (activeTab === 'all') return true
        if (activeTab === 'new') return inq.status === 'new'
        return ['contacted', 'reserved', 'closed'].includes(inq.status)
  })

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
                          if (status !== 'new') setExpandedId(null)
                }
        } finally {
                setUpdatingId(null)
        }
  }

  return (
        <div className="min-h-full bg-gray-50/60">
              <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-10 space-y-5">
              
                {/* ヘッダー */}
                      <div>
                                <h1 className="text-[22px] font-black tracking-tight text-gray-900">お問い合わせ</h1>h1>
                                <p className="text-sm text-gray-400 mt-0.5">全 {inquiries.length}件</p>p>
                      </div>div>
              
                {/* タブ */}
                      <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-2xl shadow-sm w-fit">
                        {([
          { key: 'new' as TabKey,       label: '未対応',   count: newCount  },
          { key: 'contacted' as TabKey, label: '対応済み', count: doneCount },
          { key: 'all' as TabKey,       label: 'すべて',   count: inquiries.length },
                    ] as const).map(({ key, label, count }) => (
                      <button
                                      key={key}
                                      onClick={() => setActiveTab(key)}
                                      className={cn(
                                                        'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                                                        activeTab === key
                                                          ? 'bg-indigo-600 text-white shadow-sm'
                                                          : 'text-gray-400 hover:text-gray-700'
                                                      )}
                                    >
                        {label}
                        {count > 0 && (
                                                      <span className={cn(
                                                                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                                                                          activeTab === key
                                                                            ? 'bg-white/20 text-white'
                                                                            : key === 'new' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                                                                        )}>
                                                        {count}
                                                      </span>span>
                                    )}
                      </button>button>
                    ))}
                      </div>div>
              
                {/* リスト */}
                {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                                <MessageSquare className="mx-auto h-9 w-9 text-gray-200 mb-3" />
                                <p className="text-sm font-semibold text-gray-400">
                                  {activeTab === 'new' ? '未対応のお問い合わせはありません' : 'お問い合わせはありません'}
                                </p>p>
                    </div>div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map(inq => {
                                    const cfg = statusConfig[inq.status] ?? statusConfig.closed
                                                    const isExpanded = expandedId === inq.id
                                                                    const isUpdating = updatingId === inq.id
                                                                                    const isNew = inq.status === 'new'
                                                                                      
                                                                                                    return (
                                                                                                                      <div
                                                                                                                                          key={inq.id}
                                                                                                                                          className={cn(
                                                                                                                                                                'rounded-2xl border bg-white overflow-hidden transition-all',
                                                                                                                                                                isNew
                                                                                                                                                                  ? 'border-orange-100 shadow-sm shadow-orange-50/60'
                                                                                                                                                                  : 'border-gray-100 shadow-sm'
                                                                                                                                                              )}
                                                                                                                                        >
                                                                                                                                        <button
                                                                                                                                                              onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                                                                                                                                                              className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-gray-50/60 transition-colors"
                                                                                                                                                            >
                                                                                                                                                            <div className={cn(
                                                                                                                                                                                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black',
                                                                                                                                                                                    isNew ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                                                                                                                                                                                  )}>
                                                                                                                                                              {(inq.customer_name ?? '?').charAt(0)}
                                                                                                                                                              </div>div>
                                                                                                                                                            <div className="flex-1 min-w-0">
                                                                                                                                                                                  <div className="flex items-center gap-2 flex-wrap">
                                                                                                                                                                                                          <span className="font-bold text-sm text-gray-900">
                                                                                                                                                                                                                                    {inq.customer_name ?? '匿名のお客様'}
                                                                                                                                                                                                                                  </span>span>
                                                                                                                                                                                                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                                                                                                                                                                                                                                    {cfg.label}
                                                                                                                                                                                                                                  </span>span>
                                                                                                                                                                                                          {inq.source && (
                                                                                                                                                                                        <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">
                                                                                                                                                                                                                    {sourceLabel[inq.source] ?? inq.source}
                                                                                                                                                                                                                  </span>span>
                                                                                                                                                                                                          )}
                                                                                                                                                                                                        </div>div>
                                                                                                                                                              {inq.message && (
                                                                                                                                                                                      <p className={cn(
                                                                                                                                                                                                                  'text-sm text-gray-500 mt-1 leading-relaxed',
                                                                                                                                                                                                                  !isExpanded && 'line-clamp-1'
                                                                                                                                                                                                                )}>
                                                                                                                                                                                                                {inq.message}
                                                                                                                                                                                                              </p>p>
                                                                                                                                                                                  )}
                                                                                                                                                                                  <p className="text-xs text-gray-300 mt-1 flex items-center gap-1">
                                                                                                                                                                                                          <Calendar className="h-3 w-3" />
                                                                                                                                                                                                          {format(new Date(inq.created_at), 'M月d日（E） HH:mm', { locale: ja })}
                                                                                                                                                                                                        </p>p>
                                                                                                                                                              </div>div>
                                                                                                                                                            <ArrowRight className={cn(
                                                                                                                                                                                    'h-4 w-4 text-gray-300 shrink-0 mt-1 transition-transform',
                                                                                                                                                                                    isExpanded && 'rotate-90'
                                                                                                                                                                                  )} />
                                                                                                                                          </button>button>
                                                                                                                        {isExpanded && (
                                                                                                                                                              <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-4">
                                                                                                                                                                                    <div className="space-y-2 mb-4">
                                                                                                                                                                                                            {inq.customer_phone && (
                                                                                                                                                                                          <a href={`tel:${inq.customer_phone}`}
                                                                                                                                                                                                                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors font-medium">
                                                                                                                                                                                                                      <Phone className="h-4 w-4 text-gray-400" />
                                                                                                                                                                                                                      {inq.customer_phone}
                                                                                                                                                                                                                    </a>a>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                            {inq.customer_email && (
                                                                                                                                                                                          <a href={`mailto:${inq.customer_email}`}
                                                                                                                                                                                                                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors font-medium">
                                                                                                                                                                                                                      <Mail className="h-4 w-4 text-gray-400" />
                                                                                                                                                                                                                      {inq.customer_email}
                                                                                                                                                                                                                    </a>a>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                            {inq.message && (
                                                                                                                                                                                          <div className="rounded-xl bg-white border border-gray-100 p-3 mt-2">
                                                                                                                                                                                                                      <p className="text-[11px] font-bold text-gray-400 mb-1">メッセージ</p>p>
                                                                                                                                                                                                                      <p className="text-sm text-gray-700 leading-relaxed">{inq.message}</p>p>
                                                                                                                                                                                                                    </div>div>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                          </div>div>
                                                                                                                                                                                    <div className="flex flex-wrap gap-2">
                                                                                                                                                                                                            {isNew && (
                                                                                                                                                                                          <button
                                                                                                                                                                                                                        onClick={() => updateStatus(inq.id, 'contacted')}
                                                                                                                                                                                                                        disabled={isUpdating}
                                                                                                                                                                                                                        className="flex items-center gap-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold px-4 py-2 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                                                                                                                                                                                                      >
                                                                                                                                                                                                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                                                                                                                                                                                                      {isUpdating ? '更新中...' : '対応済みにする'}
                                                                                                                                                                                                                    </button>button>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                            {isNew && (
                                                                                                                                                                                          <button
                                                                                                                                                                                                                        onClick={() => updateStatus(inq.id, 'reserved')}
                                                                                                                                                                                                                        disabled={isUpdating}
                                                                                                                                                                                                                        className="flex items-center gap-1.5 rounded-full bg-blue-500 text-white text-xs font-bold px-4 py-2 hover:bg-blue-600 disabled:opacity-50 transition-colors"
                                                                                                                                                                                                                      >
                                                                                                                                                                                                                      <Calendar className="h-3.5 w-3.5" />
                                                                                                                                                                                                                      予約済みにする
                                                                                                                                                                                                                    </button>button>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                            {['contacted', 'reserved'].includes(inq.status) && (
                                                                                                                                                                                          <button
                                                                                                                                                                                                                        onClick={() => updateStatus(inq.id, 'closed')}
                                                                                                                                                                                                                        disabled={isUpdating}
                                                                                                                                                                                                                        className="flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold px-4 py-2 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                                                                                                                                                                                                      >
                                                                                                                                                                                                                      <XCircle className="h-3.5 w-3.5" />
                                                                                                                                                                                                                      完了にする
                                                                                                                                                                                                                    </button>button>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                            {inq.status !== 'new' && (
                                                                                                                                                                                          <button
                                                                                                                                                                                                                        onClick={() => updateStatus(inq.id, 'new')}
                                                                                                                                                                                                                        disabled={isUpdating}
                                                                                                                                                                                                                        className="flex items-center gap-1.5 rounded-full border border-gray-200 text-gray-500 text-xs font-bold px-4 py-2 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                                                                                                                                                                                                      >
                                                                                                                                                                                                                      未対応に戻す
                                                                                                                                                                                                                    </button>button>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                          </div>div>
                                                                                                                                                                </div>div>
                                                                                                                                        )}
                                                                                                                        </div>div>
                                                                                                                    )
                      })}
                    </div>div>
                      )}
              </div>div>
        </div>div>
      )
}</div>
