import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Tag, Plus, Calendar, ChevronRight, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Coupon {
      id: string
      title: string
      description: string | null
      discount_type: string | null
      discount_value: number | null
      valid_from: string | null
      valid_until: string | null
      usage_limit: number | null
      usage_count: number
      is_active: boolean
      created_at: string
}

function getCouponStatus(coupon: Coupon): {
      label: string
      color: string
      bg: string
      urgent?: boolean
} {
      if (!coupon.is_active) return { label: '無効', color: 'text-gray-500', bg: 'bg-gray-100' }

  const now = new Date()
      const until = coupon.valid_until ? new Date(coupon.valid_until) : null
      const from = coupon.valid_from ? new Date(coupon.valid_from) : null

  if (until && until < now) return { label: '期限切れ', color: 'text-red-600', bg: 'bg-red-50' }
      if (from && from > now) return { label: '開始前', color: 'text-blue-600', bg: 'bg-blue-50' }

  if (until) {
          const daysLeft = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (daysLeft <= 7) return { label: `残${daysLeft}日`, color: 'text-orange-600', bg: 'bg-orange-50', urgent: true }
  }

  return { label: '有効', color: 'text-emerald-700', bg: 'bg-emerald-50' }
}

function formatDiscount(coupon: Coupon): string {
      if (!coupon.discount_type || coupon.discount_value == null) return ''
      if (coupon.discount_type === 'percent') return `${coupon.discount_value}% OFF`
      if (coupon.discount_type === 'fixed') return `¥${coupon.discount_value.toLocaleString()} OFF`
      return ''
}

interface Props {
      params: { storeId: string }
}

export default async function CouponsPage({ params }: Props) {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) redirect('/login')

  const { data: coupons, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', params.storeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

  if (error) {
          return (
                    <div className="min-h-full bg-gray-50/60 flex items-center justify-center">
                            <p className="text-sm text-red-500">データの取得に失敗しました</p>p>
                    </div>div>
                  )
  }
    
      const activeCoupons = (coupons ?? []).filter(c => {
              const status = getCouponStatus(c)
                      return status.label === '有効' || status.urgent
      })
          
            return (
                    <div className="min-h-full bg-gray-50/60">
                          <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-10 space-y-6">
                          
                                  <div className="flex items-start justify-between">
                                            <div>
                                                        <h1 className="text-[22px] font-black tracking-tight text-gray-900">クーポン管理</h1>h1>
                                                        <p className="text-sm text-gray-400 mt-0.5">全 {(coupons ?? []).length}件</p>p>
                                            </div>div>
                                            <Link
                                                            href={`/dashboard/${params.storeId}/coupons/new`}
                                                            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
                                                          >
                                                        <Plus className="h-4 w-4" />
                                                        新規作成
                                            </Link>Link>
                                  </div>div>
                          
                              {activeCoupons.length > 0 && (
                                  <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3.5 flex items-center gap-3">
                                              <Tag className="h-4 w-4 text-indigo-500 shrink-0" />
                                              <p className="text-sm text-indigo-700 font-semibold">
                                                            現在 <span className="font-black">{activeCoupons.length}枚</span>span>のクーポンが有効です
                                              </p>p>
                                  </div>div>
                                  )}
                          
                              {(coupons ?? []).length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
                                              <Tag className="mx-auto h-9 w-9 text-gray-200 mb-3" />
                                              <p className="text-sm font-semibold text-gray-400">クーポンはまだありません</p>p>
                                              <Link
                                                                href={`/dashboard/${params.storeId}/coupons/new`}
                                                                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                                                              >
                                                            最初のクーポンを作成 <ChevronRight className="h-3 w-3" />
                                              </Link>Link>
                                  </div>div>
                                ) : (
                                  <div className="space-y-2">
                                      {(coupons ?? []).map(coupon => {
                                                    const status = getCouponStatus(coupon)
                                                                      const discount = formatDiscount(coupon)
                                                                                        const isExpired = status.label === '期限切れ'
                                                                                                          const isInactive = status.label === '無効'
                                                                                                              
                                                                                                                            return (
                                                                                                                                                <Link
                                                                                                                                                                      key={coupon.id}
                                                                                                                                                                      href={`/dashboard/${params.storeId}/coupons/${coupon.id}`}
                                                                                                                                                                      className={cn(
                                                                                                                                                                                              'flex items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-sm hover:bg-gray-50/60 transition-colors',
                                                                                                                                                                                              status.urgent ? 'border-orange-100' : 'border-gray-100',
                                                                                                                                                                                              (isExpired || isInactive) && 'opacity-60'
                                                                                                                                                                                            )}
                                                                                                                                                                    >
                                                                                                                                                                  <div className={cn(
                                                                                                                                                                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                                                                                                                                                                            status.urgent ? 'bg-orange-100' : isExpired || isInactive ? 'bg-gray-100' : 'bg-indigo-50'
                                                                                                                                                                                          )}>
                                                                                                                                                                      {status.urgent
                                                                                                                                                                                                ? <AlertCircle className="h-5 w-5 text-orange-500" />
                                                                                                                                                                                                : <Tag className={cn('h-5 w-5', isExpired || isInactive ? 'text-gray-400' : 'text-indigo-500')} />
                                                                                                                                                                          }
                                                                                                                                                                      </div>div>
                                                                                                                                                
                                                                                                                                                                  <div className="flex-1 min-w-0">
                                                                                                                                                                                      <div className="flex items-center gap-2 flex-wrap">
                                                                                                                                                                                                            <span className="font-bold text-sm text-gray-900 truncate">{coupon.title}</span>span>
                                                                                                                                                                                                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', status.bg, status.color)}>
                                                                                                                                                                                                                                    {status.label}
                                                                                                                                                                                                                                  </span>span>
                                                                                                                                                                                                            {discount && (
                                                                                                                                                                                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                                                                                                                                                                                          {discount}
                                                                                                                                                                                                                        </span>span>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                          </div>div>
                                                                                                                                                                  
                                                                                                                                                                      {coupon.description && (
                                                                                                                                                                                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{coupon.description}</p>p>
                                                                                                                                                                                      )}
                                                                                                                                                                  
                                                                                                                                                                                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                                                                                                                                                                            {coupon.valid_until && (
                                                                                                                                                                                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                                                                                                                                                                                          <Calendar className="h-3 w-3" />
                                                                                                                                                                                                                          {format(new Date(coupon.valid_until), 'M月d日まで', { locale: ja })}
                                                                                                                                                                                                                        </span>span>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                            {coupon.usage_limit != null && (
                                                                                                                                                                                                <span className="text-[11px] text-gray-400">
                                                                                                                                                                                                                          使用 {coupon.usage_count}/{coupon.usage_limit}回
                                                                                                                                                                                                                        </span>span>
                                                                                                                                                                                                            )}
                                                                                                                                                                                                          </div>div>
                                                                                                                                                                      </div>div>
                                                                                                                                                
                                                                                                                                                                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
                                                                                                                                                    </Link>Link>
                                                                                                                                              )
                                      })}
                                  </div>div>
                                  )}
                          </div>div>
                    </div>div>
                  )
}</div>
