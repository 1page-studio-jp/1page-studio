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
      .from('coupons')
      .select('*')
      .eq('id', params.couponId)
      .is('deleted_at', null)
      .single()

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
                                </Button>Button>
                      </Link>Link>
                      <h1 className="text-2xl font-bold">クーポンを編集</h1>h1>
              </div>div>
        
              <Card>
                      <CardContent className="p-6 space-y-6">
                                <form action={updateCoupon} className="space-y-5">
                                            <div className="space-y-2">
                                                          <Label htmlFor="coupon_name">クーポン名 *</Label>Label>
                                                          <Input
                                                                            id="coupon_name"
                                                                            name="coupon_name"
                                                                            defaultValue={coupon.coupon_name}
                                                                            placeholder="例: 初回来幷20%OFF"
                                                                            required
                                                                          />
                                            </div>div>
                                
                                            <div className="space-y-2">
                                                          <Label htmlFor="discount_description">割引内容</Label>Label>
                                                          <Input
                                                                            id="discount_description"
                                                                            name="discount_description"
                                                                            defaultValue={coupon.discount_description || ''}
                                                                            placeholder="例: 全メニモ20%オフ"
                                                                          />
                                            </div>div>
                                
                                            <div className="space-y-2">
                                                          <Label htmlFor="usage_conditions">利用条件</Label>Label>
                                                          <Textarea
                                                                            id="usage_conditions"
                                                                            name="usage_conditions"
                                                                            defaultValue={coupon.usage_conditions || ''}
                                                                            placeholder="例: 初回来店のお客様限定"
                                                                            rows={2}
                                                                          />
                                            </div>div>
                                
                                            <div className="space-y-2">
                                                          <Label htmlFor="expiry_date">有効期限</Label>Label>
                                                          <Input
                                                                            id="expiry_date"
                                                                            name="expiry_date"
                                                                            type="date"
                                                                            defaultValue={coupon.expiry_date ? coupon.expiry_date.slice(0, 10) : ''}
                                                                          />
                                            </div>div>
                                
                                            <div className="space-y-2">
                                                          <Label htmlFor="display_status">表示状態</Label>Label>
                                                          <select
                                                                            id="display_status"
                                                                            name="display_status"
                                                                            defaultValue={coupon.display_status}
                                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                          >
                                                                          <option value="visible">表示（有効）</option>option>
                                                                          <option value="hidden">非表示</option>option>
                                                                          <option value="expired">期限切れ</option>option>
                                                          </select>select>
                                            </div>div>
                                
                                            <div className="flex gap-3 pt-2">
                                                          <Button type="submit" className="flex-1">変更を保存</Button>Button>
                                                          <Link href={`/dashboard/${params.storeId}/coupons`}>
                                                                          <Button type="button" variant="outline">キャンセル</Button>Button>
                                                          </Link>Link>
                                            </div>div>
                                </form>form>
                      
                                <div className="border-t pt-4">
                                            <p className="text-sm text-muted-foreground mb-3">危険な操作</p>p>
                                            <form action={deleteCoupon}>
                                                          <Button
                                                                            type="submit"
                                                                            variant="outline"
                                                                            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 w-full"
                                                                          >
                                                                          <Trash2 className="h-4 w-4" />
                                                                          クーポンを削除する
                                                          </Button>Button>
                                            </form>form>
                                </div>div>
                      </CardContent>CardContent>
              </Card>Card>
        </div>div>
      )
}
</div>
