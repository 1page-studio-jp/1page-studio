'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

const HINT_CHIPS = [
  '初回割引あり',
  '完全個室',
  '駅近・アクセス良好',
  'スタッフの専門知識・資格',
  'こだわり素材・天然素材',
  'LINE予約OK',
  'リピーター多数',
  'ファミリー歓迎・子連れOK',
  '完全予約制',
  '駐車場あり',
]

interface LpService { name: string; description: string; price: string; tag?: string }
interface LpTestimonial { name: string; content: string; rating: number }
interface LpFaq { q: string; a: string }

interface GeneratedContent {
  catch_copy: string
  sub_copy: string
  service_description: string
  strengths: string[]
  appeal_points: string[]
  services: LpService[]
  testimonials: LpTestimonial[]
  faq: LpFaq[]
  line_cta_text: string
  line_benefit: string
  seo_title: string
  seo_description: string
}

type Step = 'input' | 'generating' | 'preview' | 'saving' | 'done'

export default function LpNewWizardPage() {
  const { storeId } = useParams() as { storeId: string }
  const router = useRouter()

  const [step, setStep] = useState<Step>('input')
  const [store, setStore] = useState<any>(null)
  const [brief, setBrief] = useState('')
  const [generated, setGenerated] = useState<GeneratedContent | null>(null)
  const [publishNow, setPublishNow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSeo, setShowSeo] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stores/' + storeId)
      .then(r => r.json())
      .then(d => setStore(d))
      .catch(() => {})
  }, [storeId])

  function addChip(chip: string) {
    setBrief(prev => prev ? prev.trimEnd() + '。' + chip : chip)
  }

  async function generate() {
    setError(null)
    setStep('generating')
    try {
      const res = await fetch('/api/ai/lp-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: store?.store_name || '店舗名',
          storeCategory: store?.category || store?.industry || '店舗',
          area: store?.area || store?.address || '',
          brief,
          existing_strengths: store?.strengths || [],
          phone: store?.phone_number || '',
          business_hours: store?.business_hours || '',
        })
      })
      if (!res.ok) throw new Error('AI生成エラー')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setGenerated(data)
      setStep('preview')
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました')
      setStep('input')
    }
  }

  async function save() {
    if (!generated) return
    setStep('saving')
    try {
      const res = await fetch('/api/admin/stores/' + storeId + '/lp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generated,
          appeal_angle: brief || 'AI生成',
          status: publishNow ? 'published' : 'draft',
        })
      })
      if (!res.ok) throw new Error('保存エラー')
      setStep('done')
      setTimeout(() => router.push('/admin/stores/' + storeId + '/lp'), 1500)
    } catch (e: any) {
      setError(e.message)
      setStep('preview')
    }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1px solid #DDD6FE', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: '.05em' }
  const card: React.CSSProperties = { background: 'white', borderRadius: 10, padding: '16px', border: '1px solid #F3F4F6', marginBottom: 10 }

  if (step === 'done') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ fontSize: 56 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2937' }}>LP{publishNow ? 'を公開しました' : 'を保存しました'}！</h2>
      <p style={{ color: '#6B7280' }}>LP一覧に移動します...</p>
    </div>
  )

  if (step === 'generating') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 24 }}>
      <div style={{ width: 56, height: 56, border: '5px solid #EDE9FE', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#374151', marginBottom: 8 }}>プロ品質のLPを生成中...</h2>
        <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>
          キャッチコピー・強み・メニュー<br />お客様の声・FAQ など全セクションを一括生成中です<br />
          <span style={{ fontSize: 12 }}>（約15〜30秒かかります）</span>
        </p>
      </div>
    </div>
  )

  if (step === 'saving') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <p style={{ color: '#6B7280' }}>保存中...</p>
    </div>
  )

  return (
    <div style={{ padding: '32px 24px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => step === 'preview' ? (setStep('input'), setGenerated(null)) : router.back()}
          style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 8 }}>
          ← {step === 'preview' ? '入力に戻る' : '戻る'}
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1F2937' }}>
          {step === 'input' ? 'LP生成ウィザード' : 'AI生成結果プレビュー'}
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {step === 'input'
            ? 'お店の情報を一言伝えるだけで、プロ品質のLP一式を自動生成します'
            : '内容を確認・編集してから公開または下書き保存してください'}
        </p>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {step === 'input' && (
        <div>
          {store && (
            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
              <strong style={{ color: '#5B21B6' }}>{store.store_name}</strong>
              <span style={{ color: '#7C3AED', marginLeft: 8 }}>
                {store.category || store.industry || ''}{(store.area || store.address) ? ' · ' + (store.area || store.address) : ''}
              </span>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8, display: 'block' }}>
              💬 このLPで何を伝えたいですか？
            </label>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
              お店の特徴・ターゲット・サービス・価格・こだわりなど、思いついたことを自由に書いてください。
            </p>
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder={'例：渋谷の美容院。20〜30代女性向け。カット5,000円〜。縮毛矯正が得意で月200名施術。完全個室で安心。LINEで予約OK。初回10%OFF。'}
              rows={5}
              style={{ ...inp, border: '1px solid #DDD6FE', fontSize: 15, lineHeight: 1.7 }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>＋ よく使われるポイントをワンクリックで追加</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {HINT_CHIPS.map((chip, i) => (
                <button key={i} onClick={() => addChip(chip)}
                  style={{ padding: '6px 14px', fontSize: 13, border: '1px solid #DDD6FE', borderRadius: 20, background: 'white', color: '#7C3AED', cursor: 'pointer' }}>
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} style={{
            width: '100%', padding: '18px 24px', fontSize: 17, fontWeight: 800,
            background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: 'white',
            border: 'none', borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(124,58,237,.35)', letterSpacing: '.02em',
          }}>
            ✨ プロ品質のLPを一括生成する
          </button>
          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }}>
            キャッチコピー・強み・メニュー・お客様の声・FAQなど全セクションを自動生成
          </p>
        </div>
      )}

      {step === 'preview' && generated && (
        <div>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#15803D' }}>
            ✅ AI生成完了 — 内容を確認・編集して保存してください
          </div>

          <div style={{ ...card, background: '#F5F3FF', border: '2px solid #DDD6FE' }}>
            <label style={{ ...lbl, color: '#7C3AED' }}>🎯 キャッチコピー（最重要）</label>
            <textarea value={generated.catch_copy}
              onChange={e => setGenerated(p => p ? { ...p, catch_copy: e.target.value } : p)}
              rows={2} style={{ ...inp, fontSize: 18, fontWeight: 800, color: '#1F2937' }} />
          </div>

          <div style={card}>
            <label style={lbl}>サブコピー</label>
            <textarea value={generated.sub_copy}
              onChange={e => setGenerated(p => p ? { ...p, sub_copy: e.target.value } : p)}
              rows={2} style={inp} />
          </div>

          <div style={card}>
            <label style={lbl}>サービス説明文</label>
            <textarea value={generated.service_description}
              onChange={e => setGenerated(p => p ? { ...p, service_description: e.target.value } : p)}
              rows={3} style={inp} />
          </div>

          <div style={card}>
            <label style={lbl}>💪 選ばれる理由（3点）</label>
            {generated.strengths.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, marginTop: 10 }}>{i + 1}</div>
                <textarea value={v}
                  onChange={e => { const arr = [...generated.strengths]; arr[i] = e.target.value; setGenerated(p => p ? { ...p, strengths: arr } : p) }}
                  rows={2} style={{ ...inp, flex: 1 }} />
              </div>
            ))}
          </div>

          <div style={card}>
            <label style={lbl}>🏷️ アピールバッジ</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {generated.appeal_points.map((v, i) => (
                <input key={i} value={v}
                  onChange={e => { const arr = [...generated.appeal_points]; arr[i] = e.target.value; setGenerated(p => p ? { ...p, appeal_points: arr } : p) }}
                  style={{ ...inp, flex: 1 }} />
              ))}
            </div>
          </div>

          <div style={card}>
            <label style={lbl}>📋 メニュー・料金</label>
            {generated.services.map((s, i) => (
              <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input value={s.name} onChange={e => { const arr = [...generated.services]; arr[i] = { ...arr[i], name: e.target.value }; setGenerated(p => p ? { ...p, services: arr } : p) }} placeholder="メニュー名" style={{ ...inp, flex: 2 }} />
                  <input value={s.price} onChange={e => { const arr = [...generated.services]; arr[i] = { ...arr[i], price: e.target.value }; setGenerated(p => p ? { ...p, services: arr } : p) }} placeholder="¥○○〜" style={{ ...inp, flex: 1 }} />
                </div>
                <textarea value={s.description} onChange={e => { const arr = [...generated.services]; arr[i] = { ...arr[i], description: e.target.value }; setGenerated(p => p ? { ...p, services: arr } : p) }} rows={2} placeholder="説明" style={inp} />
              </div>
            ))}
            <button onClick={() => setGenerated(p => p ? { ...p, services: [...p.services, { name: '', description: '', price: '¥○○〜' }] } : p)}
              style={{ background: 'none', border: '1px dashed #DDD6FE', borderRadius: 8, padding: '8px', color: '#7C3AED', cursor: 'pointer', fontSize: 13, width: '100%' }}>
              + メニューを追加
            </button>
          </div>

          <div style={card}>
            <label style={lbl}>⭐ お客様の声</label>
            {generated.testimonials.map((t, i) => (
              <div key={i} style={{ background: '#FAFAFA', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <input value={t.name} onChange={e => { const arr = [...generated.testimonials]; arr[i] = { ...arr[i], name: e.target.value }; setGenerated(p => p ? { ...p, testimonials: arr } : p) }} placeholder="30代女性" style={{ ...inp, marginBottom: 6 }} />
                <textarea value={t.content} onChange={e => { const arr = [...generated.testimonials]; arr[i] = { ...arr[i], content: e.target.value }; setGenerated(p => p ? { ...p, testimonials: arr } : p) }} rows={3} placeholder="お客様の声" style={inp} />
              </div>
            ))}
          </div>

          <div style={card}>
            <label style={lbl}>❓ よくある質問</label>
            {generated.faq.map((f, i) => (
              <div key={i} style={{ background: '#FAFAFA', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                <input value={f.q} onChange={e => { const arr = [...generated.faq]; arr[i] = { ...arr[i], q: e.target.value }; setGenerated(p => p ? { ...p, faq: arr } : p) }} placeholder="Q. 質問" style={{ ...inp, marginBottom: 6, fontWeight: 600 }} />
                <textarea value={f.a} onChange={e => { const arr = [...generated.faq]; arr[i] = { ...arr[i], a: e.target.value }; setGenerated(p => p ? { ...p, faq: arr } : p) }} rows={2} placeholder="A. 回答" style={inp} />
              </div>
            ))}
          </div>

          <div style={card}>
            <label style={lbl}>📱 LINE設定</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}><label style={{ ...lbl, fontSize: 10 }}>ボタンテキスト</label><input value={generated.line_cta_text} onChange={e => setGenerated(p => p ? { ...p, line_cta_text: e.target.value } : p)} style={inp} /></div>
              <div style={{ flex: 2 }}><label style={{ ...lbl, fontSize: 10 }}>LINE登録特典</label><input value={generated.line_benefit} onChange={e => setGenerated(p => p ? { ...p, line_benefit: e.target.value } : p)} style={inp} /></div>
            </div>
          </div>

          <button onClick={() => setShowSeo(!showSeo)} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#6B7280', cursor: 'pointer', width: '100%', marginBottom: 10 }}>
            {showSeo ? '▲' : '▼'} SEO設定（任意）
          </button>
          {showSeo && (
            <div style={card}>
              <label style={lbl}>🔍 SEOタイトル</label>
              <input value={generated.seo_title} onChange={e => setGenerated(p => p ? { ...p, seo_title: e.target.value } : p)} style={{ ...inp, marginBottom: 12 }} />
              <label style={lbl}>SEO説明文</label>
              <textarea value={generated.seo_description} onChange={e => setGenerated(p => p ? { ...p, seo_description: e.target.value } : p)} rows={2} style={inp} />
            </div>
          )}

          <div style={{ ...card, marginTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#7C3AED' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>すぐに公開する（現在公開中のLPは自動アーカイブ）</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button onClick={() => { setStep('input'); setGenerated(null) }} style={{ flex: 1, padding: '14px', fontSize: 14, fontWeight: 700, background: 'white', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 10, cursor: 'pointer' }}>
              🔄 再生成
            </button>
            <button onClick={save} style={{ flex: 2, padding: '14px', fontSize: 15, fontWeight: 800, background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,.3)' }}>
              {publishNow ? '🚀 公開する' : '💾 下書き保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
