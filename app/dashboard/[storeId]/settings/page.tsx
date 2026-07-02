'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Store, User, Building2, CheckCircle2 } from 'lucide-react'
import type { Store as StoreType } from '@/types'

export default function StoreSettingsPage() {
  const params = useParams()
  const storeId = params.storeId as string
  const supabase = createClient()
  const router = useRouter()

  const [store, setStore] = useState<StoreType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    store_name: '',
    industry: '',
    phone_number: '',
    address: '',
    postal_code: '',
    email: '',
    business_hours: '',
    website_url: '',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('stores').select('*').eq('id', storeId).single()
      if (data) {
        setStore(data)
        setForm({
          store_name: data.store_name || '',
          industry: data.industry || '',
          phone_number: data.phone_number || '',
          address: data.address || '',
          postal_code: data.postal_code || '',
          email: data.email || '',
          business_hours: data.business_hours || '',
          website_url: data.website_url || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [storeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.store_name.trim()) { setError('店舗名は必須です'); return }
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { error: err } = await supabase
        .from('stores')
        .update({
          store_name: form.store_name.trim(),
          industry: form.industry.trim() || null,
          phone_number: form.phone_number.trim() || null,
          address: form.address.trim() || null,
          postal_code: form.postal_code.trim() || null,
          email: form.email.trim() || null,
          business_hours: form.business_hours.trim() || null,
          website_url: form.website_url.trim() || null,
        })
        .eq('id', storeId)
      if (err) throw new Error(err.message)
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">店舗設定</h1>
        <p className="text-muted-foreground mt-1">店舗情報を編集します。LP に反映されます</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">店舗名 *</Label>
              <Input
                id="store_name"
                value={form.store_name}
                onChange={e => set('store_name', e.target.value)}
                placeholder="例: サロン美花"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">業種</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={e => set('industry', e.target.value)}
                  placeholder="例: 美容サロン"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="info@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              連絡先・所在地
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number">電話番号</Label>
              <Input
                id="phone_number"
                type="tel"
                value={form.phone_number}
                onChange={e => set('phone_number', e.target.value)}
                placeholder="例: 03-1234-5678"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">郵便番号</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={e => set('postal_code', e.target.value)}
                  placeholder="例: 123-4567"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="例: 東京都渋谷区渋谷1-1-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_url">ウェブサイトURL</Label>
              <Input
                id="website_url"
                type="url"
                value={form.website_url}
                onChange={e => set('website_url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">営業時間</CardTitle>
            <CardDescription className="text-xs">LP のアクセス欄に表示されます</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.business_hours}
              onChange={e => set('business_hours', e.target.value)}
              placeholder={'月〜金: 10:00〜19:00\n土日: 10:00〜18:00\n定休日: 毎週月曜日'}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Store Status (read-only for owners) */}
        {store && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                アカウント情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ステータス</span>
                <Badge variant={
                  store.status === 'active' ? 'success' :
                  store.status === 'trial' ? 'info' : 'secondary'
                }>
                  {store.status === 'active' ? 'アクティブ' :
                   store.status === 'trial' ? 'トライアル' :
                   store.status === 'inactive' ? '停止中' : store.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">店舗スラッグ</span>
                <code className="text-xs font-mono bg-muted px-2 py-1 rounded">{store.slug}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">LP URL</span>
                <a
                  href={`/lp/${store.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-mono"
                >
                  /lp/{store.slug}
                </a>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                ステータスの変更はプランの管理者にお問い合わせください
              </p>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            設定を保存しました
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2 min-w-[120px]">
            {saving ? (
              <>
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : '変更を保存'}
          </Button>
        </div>
      </form>
    </div>
  )
}
