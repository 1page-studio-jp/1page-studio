import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Trash2 } from 'lucide-react'

export default async function EditCouponPage({ params }: { params: { storeId: string; couponId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: coupon } = await supabase
    .from('coupons').select('*').eq('id', params.couponId).is('deleted_at', null).single()
  if (!coupon) redirect(`/dashboard/${params.storeId}/coupons`)

  async function updateCoupon(formData: FormData) {
    'use server'
    const supabase = createClient()
    await supabase.from('coupons').update({
      coupon_name: formData.get('coupon_name') as string,
      discount_description: (formData.get('discount_description') as string) || '',
      usage_conditions: (formData.get('usage_conditions') as string) || null,
      expiry_date: (formData.get('expiry_date') as string) || null,
      display_status: formData.get('display_status') as any,
    }).eq('id', params.couponId)
    redirect(`/dashboard/${params.storeId}/coupons`)
  }

  async function deleteCoupon() {
    'use server'
    const supabase = createClient()
    await supabase.from('coupons').update({ deleted_at: new Date().toISOString() }).eq('id', params.couponId)
    redirect(`/dashboard/${params.storeId}/coupons`)
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/${params.storeId}/coupons`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">クーポン編集</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form action={updateCoupon} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="coupon_name">クーポン名 *</Label>
              <Input
                id="coupon_name"
                name="coupon_name"
                defaultValue={coupon.coupon_name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_description">割引内容 *</Label>
              <Input
                id="discount_description"
                name="discount_description"
                defaultValue={coupon.discount_description || ''}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_conditions">利用条件</Label>
              <Textarea
                id="usage_conditions"
                name="usage_conditions"
                defaultValue={coupon.usage_conditions || ''}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry_date">有効期限</Label>
              <Input
                id="expiry_date"
                name="expiry_date"
                type="date"
                defaultValue={coupon.expiry_date ? coupon.expiry_date.split('T')[0] : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_status">表示状態</Label>
              <select
                id="display_status"
                name="display_status"
                defaultValue={coupon.display_status}
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="visible">表示中</option>
                <option value="hidden">非表示</option>
                <option value="expired">期限切れ</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">保存する</Button>
              <Link href={`/dashboard/${params.storeId}/coupons`}>
                <Button type="button" variant="outline">キャンセル</Button>
              </Link>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t">
            <form action={deleteCoupon}>
              <Button type="submit" variant="destructive" className="gap-2 w-full">
                <Trash2 className="h-4 w-4" />
                このクーポンを削除する
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
