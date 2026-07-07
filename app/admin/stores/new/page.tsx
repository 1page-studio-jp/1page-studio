'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['美容室','エステ','ネイルサロン','整体・マッサージ','カフェ・飲食','歯科','クリニック','フィットネス','その他']

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\u3000-\u9fff\uac00-\ud7af]/g, '') // CJK除去
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'store-' + Date.now().toString().slice(-6)
}

export default function NewStorePage() {
  const router = useRouter()
  const [step, setStep] = useState<'form'|'confirm'|'creating'|'done'>('form')
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  const [form, setForm] = useState({
    store_name: '',
    category: '',
    area: '',
    address: '',
    phone_number: '',
    business_hours: '',
    slug: '',
    owner_email: '',
    owner_password: '',
    owner_name: '',
  })

  const set = (k: string, v: string) => {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      // 店舗名変更時にスラッグ自動生成（まだ手動編集してなければ）
      if (k === 'store_name' && (prev.slug === '' || prev.slug === slugify(prev.store_name))) {
        next.slug = slugify(v)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    setStep('creating')
    setError('')
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '作成失敗')
      setResult(data)
      setStep('done')
    } catch (e: any) {
      setError(e.message)
      setStep('confirm')
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  if (step === 'done' && result) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">店舗を作成しました！</h2>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left text-sm">
          <p className="font-semibold text-green-800 mb-2">{result.store.store_name}</p>
          <p className="text-gray-600">スラッグ: <code className="bg-white px-1 rounded">{result.store.slug}</code></p>
          <p className="text-gray-600">LP公開URL: <code className="bg-white px-1 rounded text-xs">https://1page-studio.vercel.app/lp/{result.store.slug}</code></p>
          <p className="text-gray-600 mt-2">オーナーメール: {result.owner.email}</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/admin')}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            管理トップへ
          </button>
          <button
            onClick={() => router.push(`/admin/stores/${result.store.id}/lp`)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            LPを作成する →
          </button>
        </div>
      </div>
    )
  }

  if (step === 'creating') {
    return (
      <div className="max-w-lg mx-auto mt-32 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600">店舗とオーナーアカウントを作成中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin')} className="text-gray-400 hover:text-gray-600 text-sm">← 戻る</button>
        <h1 className="text-2xl font-bold text-gray-800">新規店舗追加</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 店舗情報 */}
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">📍 店舗情報</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>店舗名 <span className="text-red-500">*</span></label>
              <input className={inputClass} placeholder="例: サロン花 渋谷店" value={form.store_name}
                onChange={e => set('store_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>業種</label>
              <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">選択してください</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>エリア</label>
              <input className={inputClass} placeholder="例: 渋谷区" value={form.area}
                onChange={e => set('area', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>住所</label>
              <input className={inputClass} placeholder="例: 東京都渋谷区渋谷1-1-1" value={form.address}
                onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>電話番号</label>
              <input className={inputClass} placeholder="例: 03-1234-5678" value={form.phone_number}
                onChange={e => set('phone_number', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>営業時間</label>
              <input className={inputClass} placeholder="例: 10:00〜20:00（月曜定休）" value={form.business_hours}
                onChange={e => set('business_hours', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>スラッグ（LP URL）</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">/lp/</span>
                <input className={inputClass} placeholder="auto-generated" value={form.slug}
                  onChange={e => set('slug', e.target.value)} />
              </div>
              {form.slug && (
                <p className="text-xs text-gray-400 mt-1">
                  公開URL: https://1page-studio.vercel.app/lp/{form.slug}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* オーナー情報 */}
        <div className="px-6 py-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">👤 オーナーアカウント</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>オーナー名</label>
              <input className={inputClass} placeholder="例: 山田 花子" value={form.owner_name}
                onChange={e => set('owner_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>メールアドレス <span className="text-red-500">*</span></label>
              <input className={inputClass} type="email" placeholder="owner@example.com" value={form.owner_email}
                onChange={e => set('owner_email', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>初期パスワード <span className="text-red-500">*</span></label>
              <input className={inputClass} type="password" placeholder="8文字以上" value={form.owner_password}
                onChange={e => set('owner_password', e.target.value)} />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400">
                ※ オーナーはこのメール/パスワードでダッシュボードにログインできます
              </p>
            </div>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => {
              if (!form.store_name) { setError('店舗名は必須です'); return }
              if (!form.owner_email) { setError('オーナーメールは必須です'); return }
              if (!form.owner_password || form.owner_password.length < 8) { setError('パスワードは8文字以上必要です'); return }
              setError('')
              setStep('confirm')
              handleSubmit()
            }}
            disabled={!form.store_name || !form.owner_email || !form.owner_password}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            店舗を作成する →
          </button>
        </div>
      </div>
    </div>
  )
}
