import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Tag, Calendar, Percent, Hash, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Coupon } from '@/types'

export default async function CouponsPage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', params.storeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const now = new Date()

  function getCouponStatus(coupon: Coupon) {
    if (coupon.display_status !== 'visible') return { label: '無効', variant: 'secondary' as const }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) return { label: '期限切れ', variant: 'warning' as const }
    if (coupon.valid_from && new Date(coupon.valid_from) > now) return { label: '未開始', variant: 'info' as const }
    return { label: '有効', variant: 'success' as const }
  }

  const activeCoupons = (coupons || []).filter(c => {
    const s = getCouponStatus(c)
    return s.label === '有効'
  })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">クーポン管理</h1>
          <p className="text-muted-foreground mt-1">
            現在 <span className="font-medium text-foreground">{activeCoupons.length}件</span> が有効
          </p>
        </div>
        <Link href={`/dashboard/${params.storeId}/coupons/new`}>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規クーポン
          </Button>
        </Link>
      </div>

      {(!coupons || coupons.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="font-medium text-muted-foreground">クーポンがまだありません</p>
            <p className="text-sm text-muted-foreground mt-1">LP に表示するクーポンを作成しましょう。</p>
            <Link href={`/dashboard/${params.storeId}/coupons/new`} className="mt-4">
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                最初のクーポンを作る
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const status = getCouponStatus(coupon)
            const isExpiringSoon =
              coupon.valid_until &&
              new Date(coupon.valid_until) > now &&
              new Date(coupon.valid_until).getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000

            return (
              <Card key={coupon.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{coupon.title}</h3>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {isExpiringSoon && (
                          <Badge variant="warning" className="gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            もうすぐ期限
                          </Badge>
                        )}
                      </div>

                      {coupon.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{coupon.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5" />
                          {coupon.discount_type === 'percent'
                            ? `${coupon.discount_value}% OFF`
                            : coupon.discount_type === 'fixed'
                            ? `¥${coupon.discount_value?.toLocaleString()} OFF`
                            : '特典あり'}
                        </span>

                        {coupon.coupon_code && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3.5 w-3.5" />
                            <code className="font-mono bg-muted px-1 rounded">{coupon.coupon_code}</code>
                          </span>
                        )}

                        {(coupon.valid_from || coupon.valid_until) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {coupon.valid_from ? format(new Date(coupon.valid_from), 'M/d', { locale: ja }) : ''}
                            {coupon.valid_from && coupon.valid_until && ' 〜 '}
                            {coupon.valid_until ? format(new Date(coupon.valid_until), 'M/d', { locale: ja }) : ''}
                          </span>
                        )}

                        {coupon.usage_limit != null && (
                          <span className="flex items-center gap-1">
                            上限 {coupon.usage_limit}回
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Link href={`/dashboard/${params.storeId}/coupons/${coupon.id}/edit`}>
                        <Button variant="outline" size="sm">編集</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
