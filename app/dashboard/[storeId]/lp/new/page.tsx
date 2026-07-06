'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Sparkles, Plus, Trash2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { LP_TEMPLATES, getIndustry } from '@/lib/lp-templates'

function NewLpForm({ storeId }: { storeId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('template')

  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [templateApplied, setTemplateApplied] = useState(false)

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
  })

  const [aiInput, setAiInput] = useState({
    store_name: '',
    industry: '',
    target: '',
    strengths: '',
  })

  useEffect(() => {
    if (templateId && LP_TEMPLATES[templateId]) {
      const tpl = LP_TEMPLATES[templateId]
      setForm(prev => ({
        ...prev,
        catch_copy: tpl.catch_copy,
        service_description: tpl.sub_copy,
        strengths: tpl.appeal_points.slice(0, 3),
      }))
      const ind = getIndustry(templateId)
      if (ind) {
        setAiInput(prev => ({ ...prev, industry: ind.label }))
      }
      setTemplateApplied(true)
    }
  }, [templateId])

  const updateStrength = (index: number, value: string) => {
    setForm(prev => {
      const s = [...prev.strengths]
      s[index] = value
      return { ...prev, strengths: s }
    })
  }

  const addStrength = () =>
    setForm(prev => ({ ...prev, strengths: [...prev.strengths, ''] }))

  const removeStrength = (i: number) =>
    setForm(prev => ({
      ...prev,
      strengths: prev.strengths.filter((_, idx) => idx !== i),
    }))

  const handleAiGenerate = async () => {
    setAiLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/lp-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: aiInput.store_name,
          industry: aiInput.industry,
          target: aiInput.target,
          strengths: aiInput.strengths,
        }),
      })
      if (!res.ok) throw new Error('AI生成に失敗しました')
      const data = await res.json()
      setForm(prev => ({
        ...prev,
        catch_copy: data.catch_copy || prev.catch_copy,
        service_description: data.service_description || prev.service_description,
        strengths: data.strengths || prev.strengths,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI生成に失敗しました')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/lp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          title: form.title,
          catch_copy: form.catch_copy,
          service_description: form.service_description,
          strengths: form.strengths.filter(Boolean),
          pricing: form.pricing,
          access_info: form.access_info,
          business_hours: form.business_hours,
          phone_number: form.phone_number,
          line_button_url: form.line_button_url,
          instagram_url: form.instagram_url,
          google_map_embed: form.google_map_embed,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'LP作成に失敗しました')
      }
      router.push(`/dashboard/${storeId}/lp`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'LP作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const industry = templateId ? getIndustry(templateId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/${storeId}/lp`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">新規LP作成</h1>
      </div>

      {industry && templateApplied && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-sm text-green-700">
            <strong>{industry.emoji} {industry.label}</strong>{' '}
            のテンプレートを適用しました。内容を確認・編集してください。
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AIでLP文章を自動生成
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>店舗名</Label>
              <Input
                value={aiInput.store_name}
                onChange={e =>
                  setAiInput(prev => ({ ...prev, store_name: e.target.value }))
                }
                placeholder="例: カフェ○○"
              />
            </div>
            <div className="space-y-2">
              <Label>業種</Label>
              <Input
                value={aiInput.industry}
                onChange={e =>
                  setAiInput(prev => ({ ...prev, industry: e.target.value }))
                }
                placeholder="例: 美容室、整体院"
              />
            </div>
            <div className="space-y-2">
              <Label>ターゲット客層</Label>
              <Input
                value={aiInput.target}
                onChange={e =>
                  setAiInput(prev => ({ ...prev, target: e.target.value }))
                }
                placeholder="例: 20〜40代の女性"
              />
            </div>
            <div className="space-y-2">
              <Label>強み・特徴</Label>
              <Input
                value={aiInput.strengths}
                onChange={e =>
                  setAiInput(prev => ({ ...prev, strengths: e.target.value }))
                }
                placeholder="例: 駅近、個室あり、実績10年"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiInput.store_name}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {aiLoading ? 'AI生成中...' : 'AIで文章を生成'}
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                LPタイトル <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="例: ○○サロン | 初回限定キャンペーン"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="catch_copy">キャッチコピー</Label>
              <Textarea
                id="catch_copy"
                value={form.catch_copy}
                onChange={e =>
                  setForm(p => ({ ...p, catch_copy: e.target.value }))
                }
                placeholder="例: あなたの美しさを引き出す、プロのケア"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service_description">サービス説明</Label>
              <Textarea
                id="service_description"
                value={form.service_description}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    service_description: e.target.value,
                  }))
                }
                placeholder="お店のサービス内容を詳しく説明してください"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>選ばれる理由</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.strengths.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s}
                  onChange={e => updateStrength(i, e.target.value)}
                  placeholder={`理由 ${i + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStrength(i)}
                  disabled={form.strengths.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addStrength}
            >
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>店舗情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pricing">料金・プラン</Label>
              <Textarea
                id="pricing"
                value={form.pricing}
                onChange={e =>
                  setForm(p => ({ ...p, pricing: e.target.value }))
                }
                placeholder="例: カット ¥3,300〜"
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business_hours">営業時間</Label>
                <Input
                  id="business_hours"
                  value={form.business_hours}
                  onChange={e =>
                    setForm(p => ({ ...p, business_hours: e.target.value }))
                  }
                  placeholder="例: 10:00〜19:00（火曜定休）"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">電話番号</Label>
                <Input
                  id="phone_number"
                  value={form.phone_number}
                  onChange={e =>
                    setForm(p => ({ ...p, phone_number: e.target.value }))
                  }
                  placeholder="例: 03-1234-5678"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="access_info">アクセス</Label>
              <Input
                id="access_info"
                value={form.access_info}
                onChange={e =>
                  setForm(p => ({ ...p, access_info: e.target.value }))
                }
                placeholder="例: ○○駅 徒歩3分"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SNS・外部リンク</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="line_button_url">LINE公式アカウントURL</Label>
              <Input
                id="line_button_url"
                type="url"
                value={form.line_button_url}
                onChange={e =>
                  setForm(p => ({ ...p, line_button_url: e.target.value }))
                }
                placeholder="https://lin.ee/xxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                type="url"
                value={form.instagram_url}
                onChange={e =>
                  setForm(p => ({ ...p, instagram_url: e.target.value }))
                }
                placeholder="https://www.instagram.com/アカウント名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google_map_embed">Googleマップ埋め込みURL</Label>
              <Input
                id="google_map_embed"
                value={form.google_map_embed}
                onChange={e =>
                  setForm(p => ({ ...p, google_map_embed: e.target.value }))
                }
                placeholder="Google マップ の「共有」→「地図を埋め込む」のURLを貼り付け"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={loading}>
            {loading ? '作成中...' : 'LPを作成'}
          </Button>
          <Link href={`/dashboard/${storeId}/lp`}>
            <Button type="button" variant="outline">
              キャンセル
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function NewLpPage({
  params,
}: {
  params: { storeId: string }
}) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">読み込み中...</div>}>
      <NewLpForm storeId={params.storeId} />
    </Suspense>
  )
}
