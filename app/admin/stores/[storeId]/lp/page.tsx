'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface LpPage {
  id: string
  appeal_angle: string | null
  catch_copy: string | null
  status: string
  created_at: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  published: { label: '公開中', color: '#10B981' },
  draft:     { label: '下書き', color: '#6B7280' },
  archived:  { label: 'アーカイブ', color: '#9CA3AF' },
}

export default function AdminLpListPage() {
  const { storeId } = useParams() as { storeId: string }
  const [lps, setLps] = useState<LpPage[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => { fetchLps() }, [storeId])

  async function fetchLps() {
    setLoading(true)
    const res = await fetch('/api/admin/stores/' + storeId + '/lp')
    const data = await res.json()
    setLps(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function changeStatus(lp: LpPage, newStatus: string) {
    setActionId(lp.id)
    await fetch('/api/admin/lp/' + lp.id + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, store_id: storeId })
    })
    await fetchLps()
    setActionId(null)
  }

  const published = lps.find(l => l.status === 'published')

  return (
    <div style={{ padding: '32px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1F2937' }}>LP管理</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>訴求角度を変えてテスト。月3本が目安。</p>
        </div>
        <Link href={'/admin/stores/' + storeId + '/lp/new'} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'linear-gradient(135deg,#7C3AED,#EC4899)', color: 'white',
          padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 14,
          textDecoration: 'none', boxShadow: '0 2px 8px rgba(124,58,237,.3)'
        }}>＋ AIでLP生成</Link>
      </div>

      {published && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#065F46' }}>
          🟢 公開中: <strong>{published.appeal_angle || published.catch_copy || 'LP'}</strong>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>読み込み中...</div>
      ) : lps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: 'white', borderRadius: 16, border: '2px dashed #E5E7EB' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
          <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>LPがまだありません</p>
          <Link href={'/admin/stores/' + storeId + '/lp/new'} style={{
            display: 'inline-block', background: '#7C3AED', color: 'white',
            padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none'
          }}>最初のLPをAI生成する</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lps.map(lp => {
            const st = STATUS_LABEL[lp.status] || STATUS_LABEL.draft
            return (
              <div key={lp.id} style={{
                background: 'white', borderRadius: 14, padding: '16px 20px',
                border: lp.status === 'published' ? '2px solid #10B981' : '1px solid #F3F4F6',
                boxShadow: '0 1px 6px rgba(0,0,0,.06)',
                display: 'flex', alignItems: 'center', gap: 16
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: st.color, color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{lp.appeal_angle || '訴求角度未設定'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {lp.catch_copy || 'キャッチコピー未設定'} · {new Date(lp.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {lp.status !== 'published' && (
                    <button onClick={() => changeStatus(lp, 'published')} disabled={actionId === lp.id} style={{ background: '#10B981', color: 'white', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>公開する</button>
                  )}
                  {lp.status === 'published' && (
                    <button onClick={() => changeStatus(lp, 'archived')} disabled={actionId === lp.id} style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>アーカイブ</button>
                  )}
                  {lp.status === 'archived' && (
                    <button onClick={() => changeStatus(lp, 'draft')} disabled={actionId === lp.id} style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>下書きに戻す</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}