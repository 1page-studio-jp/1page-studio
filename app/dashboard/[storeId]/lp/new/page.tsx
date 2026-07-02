'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function NewLpPage({ params }: { params: { storeId: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
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

  // AI生成のための追加フォーム
  const [aiInput, setAiInput] = useState({
    industry: '',
    features: '',
    targetCustomer: '',
  })

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))
  const setStrength = (i: number, v: string) => {
    const strengths = [...form.strengths]
    strengths[i] = v
    set('strengths', strengths)
  }

  const handleAiGenerate = async () => {
    if (!aiInput.features) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/lp-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: params.storeId,
          ...aiInput,
        }),
      })
      const data = await res.json()
      if (data.catchCopy) setForm(p => ({ ...p, catch_copy: data.catchCopy }))
      if (data.serviceDescription) setForm(p => ({ ...p, service_description: data.serviceDescription }))
      if (data.strengths?.length) setForm(p => ({ ...p, strengths: [...data.strengths, ''] }))
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/lp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, store_id: params.storeId, status }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'エラーが発生しました')
      setLoading(false)
      return
    }
    router.push(`/dashboard/${params.storeId}/lp`)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/${params.storeId}/lp`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">LP作成</h1>
          <p className="text-sm text-muted-foreground">店舗の集客ページを作成します</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      {/* AI Assist */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            文章をAIで自動生成
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">業種</Label>
              <Input placeholder="美容室" value={aiInput.industry} onChange={e => setAiInput(p => ({ ...p, industry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">ターゲット</Label>
              <Input placeholder="30代女性" value={aiInput.targetCustomer} onChange={e => setAiInput(p => ({ ...p, targetCustomer: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">特徴・強み（箇条書きでOK）</Label>
            <Textarea
              placeholder="・経験15年のスタイリスト&#10;・完全個室&#10;・駅徒歩3分"
              className="min-h-[80px]"
              value={aiInput.features}
              onChange={e => setAiInput(p => ({ ...p, features: e.target.value }))}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiInput.features}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {aiLoading ? 'AIが生成中...' : '文章を生成する'}
          </Button>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>LPタイトル *</Label>
            <Input placeholder="〇〇美容室 公式ページ" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>キャッチコピー</Label>
            <Input placeholder="あなたの美しさを引き出す、特別な時間" value={form.catch_copy} onChange={e => set('catch_copy', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>サービス説明</Label>
            <Textarea
              className="min-h-[100px]"
              placeholder="店舗・サービスの説明文"
              value={form.service_description}
              onChange={e => set('service_description', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>強み・特徴</Label>
            {form.strengths.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`強み ${i + 1}`}
                  value={s}
                  onChange={e => setStrength(i, e.target.value)}
                />
                {i === form.strengths.length - 1 && (
                  <Button variant="ghost" size="icon" onClick={() => set('strengths', [...form.strengths, ''])}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>料金・メニュー</Label>
            <Textarea
              className="min-h-[80px]"
              placeholder="カット ¥4,400〜&#10;カラー ¥8,800〜"
              value={form.pricing}
              onChange={e => set('pricing', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact & Access */}
      <Card>
        <CardHeader><CardTitle className="text-base">アクセス・連絡先</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>住所・アクセス</Label>
            <Textarea placeholder="東京都渋谷区〇〇 · 渋谷駅徒歩3分" value={form.access_info} onChange={e => set('access_info', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>営業時間</Label>
              <Input placeholder="10:00〜20:00（火曜定休）" value={form.business_hours} onChange={e => set('business_hours', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input placeholder="03-0000-0000" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <Card>
        <CardHeader><CardTitle className="text-base">集客リンク</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>LINE登録URL</Label>
            <Input placeholder="https://lin.ee/XXXXXX" value={form.line_button_url} onChange={e => set('line_button_url', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Instagram URL</Label>
            <Input placeholder="https://instagram.com/yourstore" value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Googleマップ 埋め込みコード</Label>
            <Textarea placeholder={'<iframe src="https://maps.google.com/..." />'} className="min-h-[80px] font-mono text-xs" value={form.google_map_embed} onChange={e => set('google_map_embed', e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="coupon_display"
              checked={form.coupon_display}
              onChange={e => set('coupon_display', e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="coupon_display">LINEクーポンをLPに表示する</Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button onClick={() => handleSubmit('draft')} variant="outline" disabled={loading} className="flex-1">
          下書き保存
        </Button>
        <Button onClick={() => handleSubmit('published')} disabled={loading || !form.title} className="flex-1">
          {loading ? '保存中...' : '公開する'}
        </Button>
      </div>
    </div>
  )
}
