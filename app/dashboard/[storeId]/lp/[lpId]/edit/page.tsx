'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Eye, Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function EditLpPage() {
  const params = useParams()
  const storeId = params.storeId as string
  const lpId = params.lpId as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  const [slug, setSlug] = useState('')
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'published' | 'archived'>('draft')

  const [form, setForm] = useState({
    title: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    catch_copy: '',
    service_description: '',
    strengths: ['', '', ''],
    pricing: '',
    access_info: '',
    business_hours: '',
    phone_number: '',
    line_button_url: '',
    instagram_url: '',
    google_map_embed: '',
    coupon_display: true,
  })

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))
  const setStrength = (i: number, v: string) => {
    const arr = [...form.strengths]
    arr[i] = v
    set('strengths', arr)
  }

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('lp_pages')
        .select('*')
        .eq('id', lpId)
        .eq('store_id', storeId)
        .is('deleted_at', null)
        .single()

      if (err || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setSlug(data.slug || '')
      setCurrentStatus(data.status)
      setForm({
        title: data.title || '',
        status: data.status || 'draft',
        catch_copy: data.catch_copy || '',
        service_description: data.service_description || '',
        strengths: Array.isArray(data.strengths) && data.strengths.length > 0
          ? [...data.strengths, '', '', ''].slice(0, Math.max(3, data.strengths.length))
          : ['', '', ''],
        pricing: data.pricing || '',
        access_info: data.access_info || '',
        business_hours: data.business_hours || '',
        phone_number: data.phone_number || '',
        line_button_url: data.line_button_url || '',
        instagram_url: data.instagram_url || '',
        google_map_embed: data.google_map_embed || '',
        coupon_display: data.coupon_display !== false,
      })
      setLoading(false)
    }
    load()
  }, [lpId, storeId])

  const handleSave = async (publish?: boolean) => {
    if (!form.title.trim()) { setError('タイトルは必須です'); return }
    setSaving(true)
    setSaved(false)
    setError('')

    const payload = {
      title: form.title.trim(),
      status: publish ? 'published' : form.status,
      catch_copy: form.catch_copy.trim() || null,
      service_description: form.service_description.trim() || null,
      strengths: form.strengths.filter(s => s.trim()),
      pricing: form.pricing.trim() || null,
      access_info: form.access_info.trim() || null,
      business_hours: form.business_hours.trim() || null,
      phone_number: form.phone_number.trim() || null,
      line_button_url: form.line_button_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      google_map_embed: form.google_map_embed.trim() || null,
      coupon_display: form.coupon_display,
    }

    try {
      const res = await fetch(`/api/lp/${lpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存に失敗しました')
      setSaved(true)
      if (publish) {
        setForm(f => ({ ...f, status: 'published' }))
        setCurrentStatus('published')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('このLPを削除しますか？この操作は元に戻せません。')) return
    try {
      const res = await fetch(`/api/lp/${lpId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      router.push(`/dashboard/${storeId}/lp`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-semibold mb-2">LPが見つかりません</h2>
        <p className="text-sm text-muted-foreground mb-4">削除済みか、アクセス権がありません</p>
        <Link href={`/dashboard/${storeId}/lp`}>
          <Button variant="outline" size="sm">LP一覧に戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/${storeId}/lp`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          LP一覧に戻る
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">LP 編集</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={
                currentStatus === 'published' ? 'success' :
                currentStatus === 'draft' ? 'secondary' : 'warning'
              }>
                {currentStatus === 'published' ? '公開中' :
                 currentStatus === 'draft' ? '下書き' : 'アーカイブ'}
              </Badge>
              {slug && (
                <a
                  href={`/lp/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Eye className="h-3 w-3" />
                  LPを見る
                </a>
              )}
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">LP タイトル *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="例: 渋谷の美容サロン - 初回体験コース"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <select
                id="status"
                value={form.status}
                onChange={e => set('status', e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="draft">下書き（非公開）</option>
                <option value="published">公開中</option>
                <option value="archived">アーカイブ</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Copy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">コピー・説明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="catch_copy">キャッチコピー</Label>
              <Input
                id="catch_copy"
                value={form.catch_copy}
                onChange={e => set('catch_copy', e.target.value)}
                placeholder="例: 初回限定！特別体験コース受付中"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_description">サービス説明</Label>
              <Textarea
                id="service_description"
                value={form.service_description}
                onChange={e => set('service_description', e.target.value)}
                rows={4}
                placeholder="サービスの詳細や特徴を入力"
              />
            </div>
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">強み・特徴</CardTitle>
            <CardDescription className="text-xs">LP の「選ばれる理由」セクションに表示</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                <Input
                  value={s}
                  onChange={e => setStrength(i, e.target.value)}
                  placeholder={`強み ${i + 1}`}
                />
                {form.strengths.length > 1 && (
                  <button
                    type="button"
                    onClick={() => set('strengths', form.strengths.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {form.strengths.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('strengths', [...form.strengths, ''])}
                className="gap-1.5 mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                追加
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">料金・プラン</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.pricing}
              onChange={e => set('pricing', e.target.value)}
              rows={4}
              placeholder={'通常コース: ¥5,000\n初回体験コース: ¥2,980\n回数券(10回): ¥45,000'}
            />
          </CardContent>
        </Card>

        {/* Access & Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">アクセス・連絡先</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access_info">アクセス情報</Label>
              <Textarea
                id="access_info"
                value={form.access_info}
                onChange={e => set('access_info', e.target.value)}
                rows={3}
                placeholder="例: 渋谷駅徒歩5分、〇〇ビル3F"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_hours">営業時間</Label>
              <Textarea
                id="business_hours"
                value={form.business_hours}
                onChange={e => set('business_hours', e.target.value)}
                rows={3}
                placeholder={'月〜金: 10:00〜19:00\n土日: 10:00〜18:00'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">電話番号</Label>
              <Input
                id="phone_number"
                type="tel"
                value={form.phone_number}
                onChange={e => set('phone_number', e.target.value)}
                placeholder="03-1234-5678"
              />
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">外部リンク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="line_button_url">LINE 友だち追加 URL</Label>
              <Input
                id="line_button_url"
                type="url"
                value={form.line_button_url}
                onChange={e => set('line_button_url', e.target.value)}
                placeholder="https://lin.ee/xxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                type="url"
                value={form.instagram_url}
                onChange={e => set('instagram_url', e.target.value)}
                placeholder="https://instagram.com/yourstore"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google_map_embed">Google マップ 埋め込みURL</Label>
              <Textarea
                id="google_map_embed"
                value={form.google_map_embed}
                onChange={e => set('google_map_embed', e.target.value)}
                rows={2}
                placeholder="Google マップの「共有 > 地図を埋め込む」の src= の値を貼り付け"
              />
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">表示オプション</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.coupon_display}
                onChange={e => set('coupon_display', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm font-medium">クーポンを LP に表示する</span>
            </label>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            保存しました
          </div>
        )}

        <div className="flex gap-3 justify-between">
          <Link href={`/dashboard/${storeId}/lp`}>
            <Button type="button" variant="outline">キャンセル</Button>
          </Link>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave()}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              下書き保存
            </Button>
            {currentStatus !== 'published' && (
              <Button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </span>
                ) : '公開する'}
              </Button>
            )}
            {currentStatus === 'published' && (
              <Button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </span>
                ) : '変更を保存'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
