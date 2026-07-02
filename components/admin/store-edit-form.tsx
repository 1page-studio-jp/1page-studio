'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Store } from '@/types'

const STATUSES = ['active', 'trial', 'inactive', 'canceled'] as const
const STATUS_LABELS = { active: '稼働中', trial: 'トライアル', inactive: '停止中', canceled: '解約' }
const INDUSTRIES = ['飲食店', '美容室', '整体院', '整骨院', 'パーソナルジム', 'エステサロン', 'ネイルサロン', '不動産', '工務店', '士業', 'クリニック', 'その他']

export function StoreEditForm({ store }: { store: Store }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    store_name: store.store_name,
    industry: store.industry,
    phone_number: store.phone_number ?? '',
    address: store.address ?? '',
    email: store.email ?? '',
    business_hours: store.business_hours ?? '',
    status: store.status,
  })
  const router = useRouter()

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    setLoading(true)
    await fetch(`/api/admin/stores/${store.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Edit className="h-3.5 w-3.5 mr-1.5" />
        店舗情報を編集
      </Button>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border p-4 bg-muted/30">
      <div className="space-y-1.5">
        <Label className="text-xs">店舗名</Label>
        <Input value={form.store_name} onChange={e => set('store_name', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">業種</Label>
        <select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          value={form.industry} onChange={e => set('industry', e.target.value)}>
          {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">電話番号</Label>
        <Input value={form.phone_number} onChange={e => set('phone_number', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">住所</Label>
        <Input value={form.address} onChange={e => set('address', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">営業時間</Label>
        <Input value={form.business_hours} onChange={e => set('business_hours', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">ステータス</Label>
        <select className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          value={form.status} onChange={e => set('status', e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={save} disabled={loading}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {loading ? '保存中...' : '保存'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5 mr-1.5" />キャンセル
        </Button>
      </div>
    </div>
  )
}
