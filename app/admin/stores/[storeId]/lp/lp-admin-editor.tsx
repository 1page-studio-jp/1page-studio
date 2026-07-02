'use client'

import { useState } from 'react'
import {
  Plus, Trash2, Save, Eye, Loader2, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle2, AlertCircle, Sparkles, Palette,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { INDUSTRIES, getTemplate, applyTemplateToLP } from '@/lib/lp-templates'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Store {
  id: string
  store_name: string
  slug: string
  industry: string
  address?: string
}

interface LpPage {
  id: string
  title: string
  status: string
  slug?: string
  catch_copy?: string
  sub_copy?: string
  service_description?: string
  strengths?: string[]
  appeal_points?: string[]
  services?: ServiceItem[]
  features?: string[]
  pricing?: string
  cta_text?: string
  line_cta_text?: string
  line_benefit?: string
  line_button_url?: string
  primary_color?: string
  access_info?: string
  business_hours?: string
  phone_number?: string
  instagram_url?: string
  google_map_embed?: string
  coupon_display?: boolean
  template_id?: string
  seo_title?: string
  seo_description?: string
  target_keywords?: string[]
  ad_headline?: string
}

interface ServiceItem {
  name: string
  description: string
  price?: string
  tag?: string
}

interface Props {
  store: Store
  lps: LpPage[]
}

// セクションの折りたたみコンポーネント
function Section({
  title, children, defaultOpen = true,
  badge,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          {badge}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}

function ServiceEditor({ services, onChange }: { services: ServiceItem[]; onChange: (v: ServiceItem[]) => void }) {
  const update = (i: number, k: keyof ServiceItem, v: string) => {
    const next = [...services]
    next[i] = { ...next[i], [k]: v }
    onChange(next)
  }
  const remove = (i: number) => onChange(services.filter((_, j) => j !== i))
  const add = () => onChange([...services, { name: '', description: '', price: '', tag: '' }])

  return (
    <div className="space-y-3">
      {services.map((s, i) => (
        <div key={i} className="rounded-xl border bg-slate-50/50 p-4 space-y-2 relative">
          <div className="absolute top-3 right-3">
            <button onClick={() => remove(i)} className="rounded-lg p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pr-6">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">メニュー名 *</label>
              <Input value={s.name} onChange={e => update(i, 'name', e.target.value)} placeholder="縮毛矯正（ショート）" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">料金</label>
              <Input value={s.price || ''} onChange={e => update(i, 'price', e.target.value)} placeholder="¥14,000〜" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">説明</label>
            <Input value={s.description} onChange={e => update(i, 'description', e.target.value)} placeholder="くせ毛・うねりをしっかり伸ばします" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">バッジ（任意）</label>
            <Input value={s.tag || ''} onChange={e => update(i, 'tag', e.target.value)} placeholder="人気No.1 / 初回限定 など" />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />メニューを追加
      </Button>
    </div>
  )
}

function StringArrayEditor({
  items, onChange, placeholder, addLabel,
}: {
  items: string[]
  onChange: (v: string[]) => void
  placeholder: string
  addLabel: string
}) {
  const update = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n) }
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, ''])

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item} onChange={e => update(i, e.target.value)} placeholder={placeholder} />
          <button onClick={() => remove(i)} className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />{addLabel}
      </Button>
    </div>
  )
}

export function LpAdminEditor({ store, lps }: Props) {
  const [selectedLpId, setSelectedLpId] = useState<string | null>(lps[0]?.id ?? null)
  const [form, setForm] = useState<Partial<LpPage>>(lps[0] ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  const set = (k: keyof LpPage, v: any) => setForm(f => ({ ...f, [k]: v }))

  const selectLp = (lp: LpPage) => {
    setSelectedLpId(lp.id)
    setForm(lp)
    setSaved(false)
    setError('')
  }

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = getTemplate(templateId)
    if (!tmpl) return
    const applied = applyTemplateToLP(tmpl, store.store_name, store.address)
    setForm(f => ({
      ...f,
      template_id: templateId,
      catch_copy: applied.catch_copy || tmpl.catch_copy,
      sub_copy: tmpl.sub_copy,
      appeal_points: tmpl.appeal_points,
      services: tmpl.services,
      features: tmpl.features,
      cta_text: tmpl.cta_text,
      line_cta_text: tmpl.line_cta_text,
      line_benefit: tmpl.line_benefit,
      primary_color: tmpl.suggested_primary_color,
      target_keywords: tmpl.target_keywords,
      ad_headline: tmpl.ad_headline_template,
    }))
    setApplyingTemplate(false)
  }

  const handleSave = async (publish?: boolean) => {
    if (!selectedLpId) return
    setSaving(true)
    setSaved(false)
    setError('')

    const payload = {
      ...form,
      status: publish ? 'published' : form.status,
      // 配列フィールドの空文字除去
      appeal_points: (form.appeal_points ?? []).filter(Boolean),
      features: (form.features ?? []).filter(Boolean),
      strengths: (form.strengths ?? []).filter(Boolean),
      target_keywords: (form.target_keywords ?? []).filter(Boolean),
    }

    try {
      const res = await fetch(`/api/lp/${selectedLpId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存に失敗しました')
      setSaved(true)
      if (publish) set('status', 'published')
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleNewLp = async () => {
    try {
      const res = await fetch('/api/lp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, title: '新しいLP', status: 'draft' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // reload page to get new LP
      window.location.reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const currentLp = lps.find(l => l.id === selectedLpId)

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">

      {/* LEFT: LP selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LP一覧</p>
          <Button variant="outline" size="sm" onClick={handleNewLp} className="gap-1.5 h-7 text-xs px-2">
            <Plus className="h-3 w-3" />新規
          </Button>
        </div>
        <div className="space-y-1.5">
          {lps.map(lp => (
            <button
              key={lp.id}
              onClick={() => selectLp(lp)}
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-left transition-all',
                selectedLpId === lp.id
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-transparent bg-card hover:border-slate-200',
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn(
                  'shrink-0 h-2 w-2 rounded-full',
                  lp.status === 'published' ? 'bg-emerald-500' :
                  lp.status === 'draft' ? 'bg-slate-300' : 'bg-amber-400',
                )} />
                <p className="text-sm font-medium truncate">{lp.title || '無題'}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 ml-4">
                {lp.status === 'published' ? '公開中' : lp.status === 'draft' ? '下書き' : 'アーカイブ'}
                {lp.template_id && ` · テンプレ: ${lp.template_id}`}
              </p>
            </button>
          ))}
          {lps.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">まだLPがありません</p>
          )}
        </div>

        {/* テンプレート再適用 */}
        {selectedLpId && (
          <div className="rounded-xl border bg-indigo-50/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />テンプレートを適用
            </p>
            <p className="text-[10px] text-muted-foreground">業種を選ぶとLPの文言を一括上書きします</p>
            <select
              className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs"
              defaultValue=""
              onChange={e => { if (e.target.value) handleApplyTemplate(e.target.value) }}
            >
              <option value="">業種を選択…</option>
              {INDUSTRIES.map(i => (
                <option key={i.id} value={i.id}>{i.emoji} {i.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* RIGHT: Editor */}
      {selectedLpId ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                value={form.title || ''}
                onChange={e => set('title', e.target.value)}
                className="text-lg font-bold border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-indigo-400"
                placeholder="LP タイトル"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={form.status || 'draft'}
                onChange={e => set('status', e.target.value)}
                className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="draft">下書き</option>
                <option value="published">公開中</option>
                <option value="archived">アーカイブ</option>
              </select>
              {currentLp?.slug && (
                <Link href={`/lp/${currentLp.slug}`} target="_blank">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />プレビュー
                  </Button>
                </Link>
              )}
              <Button
                onClick={() => handleSave()}
                disabled={saving}
                size="sm"
                variant="outline"
                className="gap-1.5"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                下書き保存
              </Button>
              {form.status !== 'published' && (
                <Button onClick={() => handleSave(true)} disabled={saving} size="sm" className="gap-1.5">
                  公開する
                </Button>
              )}
              {form.status === 'published' && (
                <Button onClick={() => handleSave()} disabled={saving} size="sm" className="gap-1.5">
                  変更を保存
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />保存しました
            </div>
          )}

          {/* ① コピーライティング */}
          <Section title="① コピーライティング" badge={
            <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-semibold">最重要</span>
          }>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>キャッチコピー <span className="text-muted-foreground text-xs">（大きく表示される一番目立つ文言）</span></Label>
                <Input
                  value={form.catch_copy || ''}
                  onChange={e => set('catch_copy', e.target.value)}
                  placeholder="縮毛矯正専門サロン｜あなたの髪の悩みを根本から解決"
                />
              </div>
              <div className="space-y-2">
                <Label>サブコピー <span className="text-muted-foreground text-xs">（キャッチコピーの下に表示）</span></Label>
                <textarea
                  value={form.sub_copy || ''}
                  onChange={e => set('sub_copy', e.target.value)}
                  rows={2}
                  placeholder="渋谷・新宿エリアで月200名が通うサロン。一人ひとりに合わせた施術で..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>CTAボタン文言</Label>
                <Input
                  value={form.cta_text || ''}
                  onChange={e => set('cta_text', e.target.value)}
                  placeholder="今すぐ無料カウンセリングを予約する"
                />
              </div>
            </div>
          </Section>

          {/* ② 選ばれる理由（アピールポイント） */}
          <Section title="② 選ばれる3つの理由">
            <StringArrayEditor
              items={form.appeal_points ?? []}
              onChange={v => set('appeal_points', v)}
              placeholder="薬剤を髪質に合わせて調合。ダメージを最小限に抑えた施術"
              addLabel="理由を追加"
            />
          </Section>

          {/* ③ メニュー・サービス */}
          <Section title="③ メニュー・サービス">
            <ServiceEditor
              services={form.services ?? []}
              onChange={v => set('services', v)}
            />
          </Section>

          {/* ④ 特徴・こだわり */}
          <Section title="④ 特徴・こだわり" defaultOpen={false}>
            <StringArrayEditor
              items={form.features ?? []}
              onChange={v => set('features', v)}
              placeholder="駅徒歩3分・完全予約制"
              addLabel="特徴を追加"
            />
          </Section>

          {/* ⑤ LINE登録 */}
          <Section title="⑤ LINE登録設定">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>LINE登録ボタンのテキスト</Label>
                <Input value={form.line_cta_text || ''} onChange={e => set('line_cta_text', e.target.value)} placeholder="LINEで相談・予約する" />
              </div>
              <div className="space-y-2">
                <Label>LINE登録特典 <span className="text-muted-foreground text-xs">（「登録するとこれがもらえます」）</span></Label>
                <Input value={form.line_benefit || ''} onChange={e => set('line_benefit', e.target.value)} placeholder="LINE登録で初回20%OFFクーポンをプレゼント" />
              </div>
              <div className="space-y-2">
                <Label>LINE友だち追加URL</Label>
                <Input type="url" value={form.line_button_url || ''} onChange={e => set('line_button_url', e.target.value)} placeholder="https://lin.ee/xxxxxxx" />
              </div>
            </div>
          </Section>

          {/* ⑥ 料金・プラン */}
          <Section title="⑥ 料金・プラン" defaultOpen={false}>
            <textarea
              value={form.pricing || ''}
              onChange={e => set('pricing', e.target.value)}
              rows={4}
              placeholder={'通常コース: ¥5,000\n初回体験コース: ¥2,980\n回数券(10回): ¥45,000'}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </Section>

          {/* ⑦ アクセス・連絡先 */}
          <Section title="⑦ アクセス・連絡先" defaultOpen={false}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>アクセス情報</Label>
                <textarea
                  value={form.access_info || ''}
                  onChange={e => set('access_info', e.target.value)}
                  rows={2}
                  placeholder="渋谷駅徒歩5分、〇〇ビル3F"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>電話番号</Label>
                  <Input type="tel" value={form.phone_number || ''} onChange={e => set('phone_number', e.target.value)} placeholder="03-1234-5678" />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input type="url" value={form.instagram_url || ''} onChange={e => set('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>営業時間</Label>
                <textarea
                  value={form.business_hours || ''}
                  onChange={e => set('business_hours', e.target.value)}
                  rows={2}
                  placeholder={'月〜金: 10:00〜19:00\n土日: 10:00〜18:00'}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Google マップ埋め込みsrc</Label>
                <Input value={form.google_map_embed || ''} onChange={e => set('google_map_embed', e.target.value)} placeholder="Google マップの「共有 > 地図を埋め込む」のsrc値" />
              </div>
            </div>
          </Section>

          {/* ⑧ デザイン */}
          <Section title="⑧ デザイン設定" defaultOpen={false}
            badge={<span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1"><Palette className="h-2.5 w-2.5" />カラー</span>}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>メインカラー</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primary_color || '#6366f1'}
                      onChange={e => set('primary_color', e.target.value)}
                      className="h-10 w-16 rounded-lg border cursor-pointer"
                    />
                    <Input
                      value={form.primary_color || '#6366f1'}
                      onChange={e => set('primary_color', e.target.value)}
                      className="w-28 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '美容室 ピンク', color: '#ec4899' },
                  { label: '飲食 レッド', color: '#dc2626' },
                  { label: '整体 ティール', color: '#0d9488' },
                  { label: 'ジム ブルー', color: '#2563eb' },
                  { label: 'インジゴ', color: '#6366f1' },
                  { label: 'エメラルド', color: '#059669' },
                  { label: 'アンバー', color: '#d97706' },
                  { label: 'スレート', color: '#475569' },
                ].map(({ label, color }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => set('primary_color', color)}
                    className={cn(
                      'rounded-lg px-2 py-2 text-[10px] font-medium text-white transition-all',
                      form.primary_color === color && 'ring-2 ring-offset-2 ring-indigo-500',
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.coupon_display !== false}
                  onChange={e => set('coupon_display', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">クーポンセクションをLPに表示する</span>
              </label>
            </div>
          </Section>

          {/* ⑨ SEO・広告文 */}
          <Section title="⑨ SEO・広告文" defaultOpen={false}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>SEOタイトル</Label>
                <Input value={form.seo_title || ''} onChange={e => set('seo_title', e.target.value)} placeholder="縮毛矯正専門サロン渋谷｜サロン美花" />
              </div>
              <div className="space-y-2">
                <Label>SEO説明文</Label>
                <textarea
                  value={form.seo_description || ''}
                  onChange={e => set('seo_description', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  placeholder="渋谷の縮毛矯正専門サロン。初回20%OFFクーポンプレゼント中。"
                />
              </div>
              <div className="space-y-2">
                <Label>広告見出し（Google広告用）</Label>
                <Input value={form.ad_headline || ''} onChange={e => set('ad_headline', e.target.value)} placeholder="【渋谷】縮毛矯正専門サロン｜初回20%OFF" />
              </div>
              <div className="space-y-2">
                <Label>ターゲットキーワード</Label>
                <StringArrayEditor
                  items={form.target_keywords ?? []}
                  onChange={v => set('target_keywords', v)}
                  placeholder="縮毛矯正 渋谷"
                  addLabel="キーワードを追加"
                />
              </div>
            </div>
          </Section>

          {/* Bottom save */}
          <div className="flex justify-end gap-3 pt-2">
            {error && (
              <p className="text-sm text-destructive flex-1">{error}</p>
            )}
            <Button variant="outline" onClick={() => handleSave()} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              下書き保存
            </Button>
            {form.status !== 'published' && (
              <Button onClick={() => handleSave(true)} disabled={saving}>公開する</Button>
            )}
            {form.status === 'published' && (
              <Button onClick={() => handleSave()} disabled={saving}>変更を保存して公開</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">LPを選択してください</p>
            <Button variant="outline" onClick={handleNewLp} className="gap-1.5">
              <Plus className="h-4 w-4" />最初のLPを作成
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
