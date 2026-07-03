'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CouponStatus } from '@/types'

type FormState = {
  coupon_name: string
  discount_description: string
  usage_conditions: string
  expiry_date: string
  display_status: CouponStatus
}

export default function NewCouponPage({ params }: { params: { storeId: string } }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    coupon_name: '',
    discount_description: '',
    usage_conditions: '',
    expiry_date: '',
    display_status: 'visible',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          coupon_name: form.coupon_name,
          discount_description: form.discount_description,
          usage_conditions: form.usage_conditions || null,
          expiry_date: form.expiry_date || null,
          display_status: form.display_status,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '作成に失敗しました')
      }
      router.push(`/dashboard/${params.storeId}/coupons`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/${params.storeId}/coupons`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規クーポン作成</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>クーポン情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="coupon_name">
                クーポン名 <span className="text-red-500">*</span>
              </label>
              <input
                id="coupon_name"
                type="text"
                required
                value={form.coupon_name}
                onChange={e => set('coupon_name', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="例: 初回限定10%OFF"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="discount_description">
                割引内容 <span className="text-red-500">*</span>
              </label>
              <input
                id="discount_description"
                type="text"
                required
                value={form.discount_description}
                onChange={e => set('discount_description', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="例: 10%割引"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="usage_conditions">
                利用条件
              </label>
              <textarea
                id="usage_conditions"
                value={form.usage_conditions}
                onChange={e => set('usage_conditions', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="例: 初回ご来店のお客様限定"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="expiry_date">
                有効期限
              </label>
              <input
                id="expiry_date"
                type="date"
                value={form.expiry_date}
                onChange={e => set('expiry_date', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="display_status">
                表示状態
              </label>
              <select
                id="display_status"
                value={form.display_status}
                onChange={e => set('display_status', e.target.value as CouponStatus)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="visible">表示中</option>
                <option value="hidden">非表示</option>
                <option value="expired">期限切れ</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? '作成中...' : 'クーポンを作成'}
              </Button>
              <Link href={`/dashboard/${params.storeId}/coupons`}>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}