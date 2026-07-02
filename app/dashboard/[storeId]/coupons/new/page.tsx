'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Tag, Sparkles } from 'lucide-react'

interface NewCouponPageProps {
  params: { storeId: string }
}

export default function NewCouponPage({ params }: NewCouponPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed' | 'gift',
    discount_value: '',
    coupon_code: '',
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    is_active: true,
  })

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('クーポン名を入力してください'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: params.storeId,
          title: form.title.trim(),
          description: form.description.trim() || null,
          discount_type: form.discount_type,
          discount_value: form.discount_value ? Number(form.discount_value) : 0,
          coupon_code: form.coupon_code.trim() || null,
          valid_from: form.valid_from || null,
          valid_until: form.valid_until || null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          is_active: form.is_active,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '作成に失敗しました')
      router.push(`/dashboard/${params.storeId}/coupons`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/dashboard/${params.storeId}/coupons`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          クーポン一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold">新規クーポン作成</h1>
        <p className="text-muted-foreground mt-1">LP に表示するクーポンを設定します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">クーポン名 *</Label>
              <Input
                id="title"
                placeholder="例: 初回限定20%OFF"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明文</Label>
              <Textarea
                id="description"
                placeholder="クーポンの詳細や利用条件などを入力"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Discount */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">割引設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>割引タイプ</Label>
              <div className="flex gap-3">
                {[
                  { value: 'percent', label: '割引率 (%)' },
                  { value: 'fixed', label: '割引額 (円)' },
                  { value: 'gift', label: '特典・サービス' },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discount_type"
                      value={value}
                      checked={form.discount_type === value}
                      onChange={() => set('discount_type', value)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {form.discount_type !== 'gift' && (
              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  {form.discount_type === 'percent' ? '割引率 (%)' : '割引額 (円)'}
                </Label>
                <div className="relative">
                  <Input
                    id="discount_value"
                    type="number"
                    min="0"
                    max={form.discount_type === 'percent' ? 100 : undefined}
                    placeholder={form.discount_type === 'percent' ? '20' : '1000'}
                    value={form.discount_value}
                    onChange={e => set('discount_value', e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {form.discount_type === 'percent' ? '%' : '円'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="coupon_code">クーポンコード（任意）</Label>
              <Input
                id="coupon_code"
                placeholder="例: WELCOME20"
                value={form.coupon_code}
                onChange={e => set('coupon_code', e.target.value.toUpperCase())}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">LP に表示するコード。空欄の場合は非表示</p>
            </div>
          </CardContent>
        </Card>

        {/* Period & Limit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">有効期間・制限</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">開始日（任意）</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={form.valid_from}
                  onChange={e => set('valid_from', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_until">終了日（任意）</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={form.valid_until}
                  onChange={e => set('valid_until', e.target.value)}
                  min={form.valid_from || undefined}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage_limit">利用上限回数（任意）</Label>
              <Input
                id="usage_limit"
                type="number"
                min="1"
                placeholder="無制限の場合は空欄"
                value={form.usage_limit}
                onChange={e => set('usage_limit', e.target.value)}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">このクーポンを有効にする（LP に表示）</span>
            </label>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link href={`/dashboard/${params.storeId}/coupons`}>
            <Button type="button" variant="outline">キャンセル</Button>
          </Link>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                作成中...
              </>
            ) : (
              <>
                <Tag className="h-4 w-4" />
                クーポンを作成
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
