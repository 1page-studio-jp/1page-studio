'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { INDUSTRIES, getTemplate } from '@/lib/lp-templates'
import { cn } from '@/lib/utils'

// Legacy industry list kept for free-text
const LEGACY_INDUSTRIES = [
  'エステサロン', 'ネイルサロン', '不動産', '工務店', '士業', 'クリニック', 'その他'
]

export default function NewStorePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [form, setForm] = useState({
    store_name: '',
    industry: 'salon',      // default: 美容室
    industry_label: '美容室・サロン',
    phone_number: '',
    address: '',
    email: '',
    ownerEmail: '',
    ownerName: '',
    ownerPassword: '',
  })

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const template = getTemplate(form.industry)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        industry: form.industry_label, // pass human label to existing API
        lp_template_id: form.industry, // new field for template auto-apply
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'エラーが発生しました')
      setLoading(false)
      return
    }

    router.push('/admin/stores')
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/stores">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新規店舗追加</h1>
          <p className="text-muted-foreground text-sm">業種を選ぶとLPテンプレートが自動生成されます</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        )}

        {/* ① 業種選択（最初に選ぶ） */}
        <Card className="border-2 border-indigo-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              業種を選択（LPテンプレートが自動生成されます）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => set('industry', ind.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all',
                    form.industry === ind.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-transparent bg-slate-50 hover:border-slate-200',
                  )}
                >
                  <span className="text-xl">{ind.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{ind.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{ind.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Template preview toggle */}
            {template && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  <span>✨ 自動生成されるLPのプレビュー</span>
                  {showTemplatePreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showTemplatePreview && (
                  <div className="px-4 pb-4 space-y-3 border-t border-indigo-100 bg-white">
                    <div className="pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">キャッチコピー</p>
                      <p className="text-sm font-bold text-indigo-800">{template.catch_copy}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">選ばれる3つの理由</p>
                      <ul className="space-y-1">
                        {template.appeal_points.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-indigo-500 font-bold shrink-0">0{i + 1}</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">メニュー例</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {template.services.slice(0, 4).map((s, i) => (
                          <div key={i} className="rounded-lg bg-slate-50 px-2 py-1.5">
                            <p className="text-[10px] font-semibold">{s.name}</p>
                            {s.price && <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{s.price}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">LINE登録特典</p>
                      <p className="text-xs text-emerald-700 font-medium">{template.line_benefit}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground bg-slate-50 rounded-lg px-2 py-1.5">
                      ※ 店舗登録後、LP管理画面で内容を自由に編集できます
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ② 店舗情報 */}
        <Card>
          <CardHeader><CardTitle className="text-base">店舗情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>店舗名 *</Label>
              <Input placeholder="例：サロン美花 渋谷店" value={form.store_name} onChange={e => set('store_name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>電話番号</Label>
                <Input placeholder="090-0000-0000" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>メール</Label>
                <Input type="email" placeholder="store@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>住所</Label>
              <Input placeholder="東京都渋谷区..." value={form.address} onChange={e => set('address', e.target.value)} />
              <p className="text-[10px] text-muted-foreground">
                住所を入力するとLPのキャッチコピーに自動で地名が挿入されます
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ③ オーナーアカウント */}
        <Card>
          <CardHeader><CardTitle className="text-base">オーナーアカウント</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>オーナー名 *</Label>
              <Input placeholder="田中 太郎" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>ログイン用メール *</Label>
              <Input type="email" placeholder="owner@example.com" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>初期パスワード *</Label>
              <Input type="password" placeholder="8文字以上" minLength={8} value={form.ownerPassword} onChange={e => set('ownerPassword', e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          <p className="font-semibold mb-1">✅ 登録後に自動で行われること</p>
          <ul className="space-y-0.5 text-xs list-disc list-inside">
            <li>業種に合わせたLPテンプレートを自動生成</li>
            <li>初回AI分析レポートを生成（翌日）</li>
            <li>オーナーへ招待メールを送信</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? '作成中...' : '店舗を作成してLPを自動生成する'}
          </Button>
          <Link href="/admin/stores">
            <Button type="button" variant="outline">キャンセル</Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
