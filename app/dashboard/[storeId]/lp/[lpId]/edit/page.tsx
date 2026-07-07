'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Save, Eye, CheckCircle2, Info } from 'lucide-react'
import Link from 'next/link'

// オーナーが編集できるフィールドのみ（デザイン・テンプレートは管理者のみ）
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
  const [lpTitle, setLpTitle] = useState('')
  const [lpSlug, setLpSlug] = useState('')

  // オーナー編集可能フィールド
  const [catchCopy, setCatchCopy] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [strengths, setStrengths] = useState(['', '', ''])
  const [businessHours, setBusinessHours] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [lineUrl, setLineUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [couponText, setCouponText] = useState('')

  useEffect(() => {
    fetchLp()
  }, [lpId])

  async function fetchLp() {
    setLoading(true)
    const { data, error } = await supabase
      .from('lp_pages')
      .select('*')
      .eq('id', lpId)
      .eq('store_id', storeId)
      .single()

    if (error || !data) {
      setError('LPが見つかりません')
      setLoading(false)
      return
    }

    setLpTitle(data.title || '')
    setLpSlug(data.slug || '')
    setCatchCopy(data.catch_copy || '')
    setServiceDescription(data.service_description || '')
    setStrengths(
      Array.isArray(data.strengths)
        ? [...data.strengths, '', '', ''].slice(0, 3)
        : ['', '', '']
    )
    setBusinessHours(data.business_hours || '')
    setPhone(data.phone || '')
    setAddress(data.address || '')
    setLineUrl(data.line_url || '')
    setInstagramUrl(data.instagram_url || '')
    setCouponText(data.coupon_text || '')
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)

    const { error } = await supabase
      .from('lp_pages')
      .update({
        catch_copy: catchCopy,
        service_description: serviceDescription,
        strengths: strengths.filter(s => s.trim()),
        business_hours: businessHours,
        phone: phone,
        address: address,
        line_url: lineUrl,
        instagram_url: instagramUrl,
        coupon_text: couponText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lpId)
      .eq('store_id', storeId)

    setSaving(false)
    if (error) {
      setError('保存に失敗しました: ' + error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/${storeId}/lp`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            LP一覧
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{lpTitle || 'LP編集'}</h1>
        </div>
        {lpSlug && (
          <a
            href={`/lp/${lpSlug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              公開ページを見る
            </Button>
          </a>
        )}
      </div>

      {/* 注意バナー */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">編集できる項目について</p>
          <p className="text-sm text-blue-700 mt-1">
            文章・連絡先・営業時間の更新が可能です。デザインやテンプレートの変更は担当パートナーにご連絡ください。
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* キャッチコピー・説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">集客メッセージ</CardTitle>
          <CardDescription>お客様に伝えたいメインメッセージです</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="catchCopy">キャッチコピー <span className="text-xs text-gray-400">（20文字以内推奨）</span></Label>
            <Input
              id="catchCopy"
              value={catchCopy}
              onChange={e => setCatchCopy(e.target.value)}
              placeholder="例：渋谷で一番あなたに寄り添うサロン"
              maxLength={40}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="serviceDescription">サービス説明 <span className="text-xs text-gray-400">（100文字前後推奨）</span></Label>
            <Textarea
              id="serviceDescription"
              value={serviceDescription}
              onChange={e => setServiceDescription(e.target.value)}
              placeholder="例：丁寧なカウンセリングで一人ひとりに合ったスタイルを提案します..."
              rows={4}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* 選ばれる理由 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">選ばれる理由</CardTitle>
          <CardDescription>お店の強みを3つ入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {strengths.map((s, i) => (
            <div key={i}>
              <Label htmlFor={`strength-${i}`}>強み {i + 1}</Label>
              <Input
                id={`strength-${i}`}
                value={s}
                onChange={e => {
                  const next = [...strengths]
                  next[i] = e.target.value
                  setStrengths(next)
                }}
                placeholder={`例：経験10年のスタイリストが担当`}
                maxLength={30}
                className="mt-1"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 店舗情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">店舗情報</CardTitle>
          <CardDescription>お客様への連絡先・営業情報です</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="businessHours">営業時間</Label>
            <Input
              id="businessHours"
              value={businessHours}
              onChange={e => setBusinessHours(e.target.value)}
              placeholder="例：10:00〜20:00（火曜定休）"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">電話番号</Label>
            <Input
              id="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="例：03-1234-5678"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="例：東京都渋谷区〇〇1-2-3"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* SNS・クーポン */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SNS・クーポン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="lineUrl">LINE友だち追加URL</Label>
            <Input
              id="lineUrl"
              value={lineUrl}
              onChange={e => setLineUrl(e.target.value)}
              placeholder="https://lin.ee/xxxxxxx"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="instagramUrl">Instagram URL</Label>
            <Input
              id="instagramUrl"
              value={instagramUrl}
              onChange={e => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/yourstore"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="couponText">クーポン内容 <span className="text-xs text-gray-400">（LP掲載クーポン）</span></Label>
            <Textarea
              id="couponText"
              value={couponText}
              onChange={e => setCouponText(e.target.value)}
              placeholder="例：初回限定20%OFF（LINEご登録の方）"
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* 保存ボタン */}
      <div className="flex justify-end gap-3 pb-8">
        <Link href={`/dashboard/${storeId}/lp`}>
          <Button variant="outline">キャンセル</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              保存中...
            </span>
          ) : saved ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              保存しました
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              保存する
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
