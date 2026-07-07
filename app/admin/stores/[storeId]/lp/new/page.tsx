'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// プリセット訴求角度
const ANGLE_PRESETS = [
  { label: '初回割引・体験', value: '初回限定の割引・体験キャンペーンで新規客を獲得する' },
  { label: 'プライバシー・個室', value: '完全個室・プライベート空間の安心感を前面に出す' },
  { label: 'スタッフの実績・技術', value: 'スタッフの経歴・資格・実績で信頼感を訴求する' },
  { label: '地域密着・アクセス', value: '駅近・地域密着・地元のお客様向けに利便性を訴求する' },
  { label: 'オーガニック・こだわり', value: '素材・薬剤・食材へのこだわりと安全性を前面に出す' },
  { label: 'LINE予約・簡単予約', value: 'LINEで簡単予約できる利便性と即レス対応を強調する' },
  { label: 'リピーター定着', value: '継続して通うメリット・ポイント・会員特典で固定客化する' },
  { label: 'カスタム', value: '' },
]

interface GeneratedContent {
  catch_copy: string
  sub_copy: string
  service_description: string
  strengths: string[]
  appeal_points: string[]
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
  const [selectedAngle, setSelectedAngle] = useState(0)
  const [customAngle, setCustomAngle] = useState('')
  const [generated, setGenerated] = useState<GeneratedContent | null>(null)
  const [publishNow, setPublishNow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stores/' + storeId)
      .then(r => r.json())
      .then(d => setStore(d))
      .catch(() => {})
  }, [storeId])

  const appealAngle = selectedAngle === ANGLE_PRESETS.length - 1
    ? customAngle
    : ANGLE_PRESETS[selectedAngle].value

  async function generate() {
    if (!appealAngle.trim()) { setError('訴求角度を入力してください'); return }
    setError(null)
    setStep('generating')
    try {
      const res = await fetch('/api/ai/lp-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: store?.store_name || '店舗名',
          storeCategory: store?.category || '店舗',
          area: store?.area || store?.address || '',
          appeal_angle: appealAngle,
          existing_strengths: store?.strengths || [],
          phone: store?.phone_number || '',
          business_hours: store?.business_hours || '',
        })
      })
      if (!res.ok) throw new Error('AI生成エラー')
      const data = await res.json()
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
          appeal_angle: appealAngle,
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

  const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' as const }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 4, display: 'block' }

  if (step === 'done') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1F2937' }}>LP{publishNow ? 'を公開しました' : 'を保存しました'}！</h2>
      <p style={{ color: '#6B7280' }}>LP一覧に移動します...</p>
    </div>
  )

  if (step === 'generating') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 20 }}>
      <div style={{ width: 48, height: 48, border: '4px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#374151' }}>AIがLPコンテンツを生成中...</h2>
      <p style={{ fontSize: 13, color: '#9CA3AF' }}>訴求角度に最適なコピーを作成しています</p>
    </div>
  )

  if (step === 'saving') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '4px solid #E5E7EB', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <p style={{ color: '#6B7280' }}>保存中...</p>
    </div>
  )

  return (
    <div style={{ padding: '32px 24px', maxWidth: 720, margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 8 }}>← 戻る</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1F2937' }}>
          {step === 'input' ? '新しいLPをAI生成' : 'AI生成結果プレビュー'}
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
          {step === 'input' ? '訴求角度を選ぶだけで、プロ品質のLPが完成します' : '内容を確認して公開・保存してください'}
        </p>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* STEP 1: 入力 */}
      {step === 'input' && (
        <div>
          {store && (
            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13 }}>
              <strong style={{ color: '#5B21B6' }}>{store.store_name}</strong>
              <span style={{ color: '#7C3AED', marginLeft: 8 }}>{store.category} · {store.area || store.address || ''}</span>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={{ ...labelStyle, fontSize: 14, color: '#374151', marginBottom: 12 }}>今月の訴求角度を選んでください</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ANGLE_PRESETS.map((preset, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                  background: selectedAngle === i ? '#F5F3FF' : 'white',
                  border: selectedAngle === i ? '2px solid #7C3AED' : '1px solid #E5E7EB',
                  borderRadius: 10, cursor: 'pointer', transition: 'all .15s'
                }}>
                  <input type="radio" name="angle" checked={selectedAngle === i} onChange={() => setSelectedAngle(i)} style={{ marginTop: 2, accentColor: '#7C3AED' }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{preset.label}</div>
                    {preset.value && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{preset.value}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedAngle === ANGLE_PRESETS.length - 1 && (
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>カスタム訴求角度</label>
              <textarea value={customAngle} onChange={e => setCustomAngle(e.target.value)} placeholder="例：ファミリー向けに子連れOKの安心空間を訴求する" rows={3} style={inputStyle} />
            </div>
          )}

          <button onClick={generate} style={{
            width: '100%', padding: '16px 24px', fontSize: 16, fontWeight: 800,
            background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: 'white',
            border: 'none', borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(124,58,237,.3)'
          }}>
            ✨ AIでLPコンテンツを生成する
          </button>
        </div>
      )}

      {/* STEP 2: プレビュー */}
      {step === 'preview' && generated && (
        <div>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#15803D' }}>
            ✅ 訴求角度: <strong>{appealAngle}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {[
              { key: 'catch_copy', label: 'キャッチコピー' },
              { key: 'sub_copy', label: 'サブコピー' },
              { key: 'service_description', label: 'サービス説明' },
              { key: 'line_cta_text', label: 'LINEボタンテキスト' },
              { key: 'line_benefit', label: 'LINE登録特典' },
              { key: 'seo_title', label: 'SEOタイトル' },
              { key: 'seo_description', label: 'SEO説明文' },
            ].map(({ key, label }) => (
              <div key={key} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px solid #F3F4F6' }}>
                <label style={labelStyle}>{label}</label>
                {editMode ? (
                  <textarea
                    value={(generated as any)[key] || ''}
                    onChange={e => setGenerated(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                    rows={key === 'service_description' || key === 'seo_description' ? 3 : 1}
                    style={{ ...inputStyle, border: '1px solid #DDD6FE' }}
                  />
                ) : (
                  <p style={{ fontSize: 15, color: '#1F2937', lineHeight: 1.6 }}>{(generated as any)[key] || '-'}</p>
                )}
              </div>
            ))}

            {(['strengths', 'appeal_points'] as const).map(key => (
              <div key={key} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '1px solid #F3F4F6' }}>
                <label style={labelStyle}>{key === 'strengths' ? '選ばれる理由（3点）' : 'アピールバッジ（3点）'}</label>
                {generated[key].map((v, i) => (
                  editMode ? (
                    <input key={i} value={v} onChange={e => {
                      const arr = [...generated[key]]
                      arr[i] = e.target.value
                      setGenerated(prev => prev ? { ...prev, [key]: arr } : prev)
                    }} style={{ ...inputStyle, marginBottom: 6 }} />
                  ) : (
                    <p key={i} style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                      {key === 'strengths' ? (i + 1) + '. ' : '✓ '}{v}
                    </p>
                  )
                ))}
              </div>
            ))}
          </div>

          {/* 公開設定 */}
          <div style={{ background: 'white', borderRadius: 10, padding: '16px', border: '1px solid #F3F4F6', marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#7C3AED' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>すぐに公開する（現在公開中のLPは自動アーカイブ）</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => { setEditMode(!editMode) }} style={{ flex: 1, padding: '14px', fontSize: 14, fontWeight: 700, background: editMode ? '#7C3AED' : 'white', color: editMode ? 'white' : '#7C3AED', border: '2px solid #7C3AED', borderRadius: 10, cursor: 'pointer' }}>
              {editMode ? '✓ 編集完了' : '✏️ 手動編集'}
            </button>
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