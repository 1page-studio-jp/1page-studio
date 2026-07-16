import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Ticket, Clock, Eye, EyeOff, BarChart2, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Coupon, CouponStatus } from '@/types'

interface Props {
  params: { storeId: string }
}

function statusLabel(status: CouponStatus): string {
  switch (status) {
    case 'visible':  return '公開中'
    case 'hidden':   return '非公開'
    case 'expired':  return '期限切れ'
    default:         return status
  }
}

function StatusBadge({ status }: { status: CouponStatus }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold'
  if (status === 'visible') {
    return (
      <span className={cn(base, 'bg-emerald-50 text-emerald-700')}>
        <Eye className="h-2.5 w-2.5" />
        {statusLabel(status)}
      </span>
    )
  }
  if (status === 'hidden') {
    return (
      <span className={cn(base, 'bg-gray-100 text-gray-500')}>
        <EyeOff className="h-2.5 w-2.5" />
        {statusLabel(status)}
      </span>
    )
  }
  // expired
  return (
    <span className={cn(base, 'bg-red-50 text-red-600')}>
      <Clock className="h-2.5 w-2.5" />
      {statusLabel(status)}
    </span>
  )
}

export default async function CouponsPage({ params }: Props) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', params.storeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-full bg-gray-50/60 flex items-center justify-center">
        <p className="text-sm text-red-500">データの取得に失敗しました</p>
      </div>
    )
  }

  const list = coupons ?? []
  const visibleCount = list.filter(c => c.display_status === 'visible').length
  const totalUses = list.reduce((s, c) => s + (c.usage_count ?? 0), 0)

  return (
    <div className="min-h-full bg-gray-50/60">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-10 space-y-5">

        {/* ヘッダー */}
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-gray-900">クーポン管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">全 {list.length}件 · 公開中 {visibleCount}件</p>
        </div>

        {/* サマリーカード */}
        {list.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">公開中のクーポン</p>
              <p className="text-2xl font-black text-indigo-600">{visibleCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">件</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">累計利用回数</p>
              <p className="text-2xl font-black text-emerald-600">{totalUses.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">回</p>
            </div>
          </div>
        )}

        {/* お知らせ */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3.5 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 leading-relaxed">
            クーポンの作成・編集はパートナーにお問い合わせください。このページでは配信状況を確認できます。
          </p>
        </div>

        {/* リスト */}
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <Ticket className="mx-auto h-9 w-9 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-400">クーポンはまだ作成されていません</p>
            <p className="text-xs text-gray-300 mt-1">パートナーにクーポン作成をご依頼ください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(coupon => {
              const isExpired = coupon.display_status === 'expired'
              return (
                <div
                  key={coupon.id}
                  className={cn(
                    'rounded-2xl border bg-white shadow-sm overflow-hidden',
                    isExpired ? 'border-gray-100 opacity-60' : 'border-gray-100',
                  )}
                >
                  {/* カラーバー */}
                  <div
                    className={cn(
                      'h-1.5 w-full',
                      coupon.display_status === 'visible'
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                        : coupon.display_status === 'hidden'
                        ? 'bg-gray-200'
                        : 'bg-red-200',
                    )}
                  />

                  <div className="px-4 py-4 space-y-3">
                    {/* タイトル行 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-gray-900">{coupon.coupon_name}</h3>
                          <StatusBadge status={coupon.display_status as CouponStatus} />
                        </div>
                        {coupon.discount_description && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                            {coupon.discount_description}
                          </p>
                        )}
                      </div>

                      {/* 利用回数 */}
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 text-gray-400">
                          <BarChart2 className="h-3 w-3" />
                          <span className="text-[11px]">利用数</span>
                        </div>
                        <p className="text-xl font-black text-gray-800 tabular-nums">
                          {(coupon.usage_count ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* 詳細行 */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {coupon.expiry_date && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            有効期限:{' '}
                            <span className={cn('font-semibold', isExpired ? 'text-red-500' : 'text-gray-600')}>
                              {format(new Date(coupon.expiry_date), 'yyyy年M月d日', { locale: ja })}
                            </span>
                          </span>
                        </div>
                      )}
                      {coupon.usage_conditions && (
                        <div className="text-[11px] text-gray-400">
                          <span className="font-semibold text-gray-500">利用条件:</span>{' '}
                          {coupon.usage_conditions}
                        </div>
                      )}
                    </div>

                    {/* 作成日 */}
                    <p className="text-[10px] text-gray-300">
                      作成: {format(new Date(coupon.created_at), 'yyyy年M月d日', { locale: ja })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
