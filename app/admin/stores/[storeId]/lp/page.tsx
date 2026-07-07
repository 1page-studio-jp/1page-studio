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

interface LpAnalytics {
  lp_id: string
  period_from: string
  period_to: string
  days: number
  lp_views: number
  line_adds: number
  cost: number
  sales: number
  cvr: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  published: { label: '公開中', color: '#10B981' },
  draft:     { label: '下書き', color: '#6B7280' },
  archived:  { label: 'アーカイブ', color: '#9CA3AF' },
}

export default function AdminLpListPage() {
  const { storeId } = useParams() as { storeId: string }
  const [lps, setLps] = useState<LpPage[]>([])
  const [analytics, setAnalytics] = useState<Record<string, LpAnalytics>>({})
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [notified, setNotified] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [storeId])

  async function fetchAll() {
    setLoading(true)
    const [lpRes, storeRes, analyticsRes] = await Promise.all([
      fetch('/api/admin/stores/' + storeId + '/lp'),
      fetch('/api/admin/stores/' + storeId),
      fetch('/api/admin/stores/' + storeId + '/lp-analytics'),
    ])
    const [lpData, storeData, analyticsData] = await Promise.all([
      lpRes.json(), storeRes.json(), analyticsRes.json()
    ])
    setLps(Array.isArray(lpData) ? lpData : [])
    setStore(storeData)
    if (Array.isArray(analyticsData)) {
      const map: Record<string, LpAnalytics> = {}
      analyticsData.forEach(a => { map[a.lp_id] = a })
      setAnalytics(map)
    }
    setLoading(false)
  }

  async function changeStatus(lp: LpPage, newStatus: string) {
    setActionId(lp.id)
    await fetch('/api/admin/lp/' + lp.id + '/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, store_id: storeId })
    })

    // 公開時にオーナー通知
    if (newStatus === 'published' && store?.slug) {
      setNotified(lp.id)
      setTimeout(() => setNotified(null), 5000)
    }

    await fetchAll()
    setActionId(null)
  }

  function getLpUrl(slug: string | null) {
    if (!slug) return null
    return 'https://1page-studio.vercel.app/lp/' + slug
  }

  function copyUrl(slug: string | null, lpId: string) {
    const url = getLpUrl(slug)
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopied(lpId)
    setTimeout(() => setCopied(null), 2000)
  }

  function notifyOwner(lp: LpPage, ownerEmail: string | null, slug: string | null) {
    const url = getLpUrl(slug)
    if (!url || !ownerEmail) return
    const subject = encodeURIComponent('[1Page Studio] 新しいLPが公開されました')
    const body = encodeURIComponent(
      '新しいランディングページが公開されました。\n\n' +
      '訴求テーマ: ' + (lp.appeal_angle || 'LP') + '\n' +
      'URL: ' + url + '\n\n' +
      'ご確認をよろしくお願いします。'
    )
    window.open('mailto:' + ownerEmail + '?subject=' + subject + '&body=' + body)
  }

  const published = lps.find(l => l.status === 'published')
  const slug = store?.slug || null

  return (
    <div style={{ padding: '32px 24px', maxWidth: 860, margin: '0 auto' }}>
      {/* ヘッダー */}
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

      {/* 公開中バナー */}
      {published && slug && (
        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#065F46' }}>
            🟢 公開中: <strong>{published.appeal_angle || published.catch_copy || 'LP'}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={'https://1page-studio.vercel.app/lp/' + slug} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#059669', background: 'white', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: 6, textDecoration: 'none' }}>公開ページを確認 →</a>
            <button onClick={() => copyUrl(slug, 'banner')} style={{ fontSize: 12, color: '#059669', background: 'white', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>
              {copied === 'banner' ? '✓ コピー済み' : 'URLをコピー'}
            </button>
          </div>
        </div>
      )}

      {/* 通知バナー */}
      {notified && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#1D4ED8' }}>✅ LPを公開しました！オーナーへURLを共有しましょう</div>
          <button onClick={() => notifyOwner(lps.find(l => l.id === notified)!, store?.owner_email || null, slug)} style={{ fontSize: 12, color: 'white', background: '#3B82F6', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            📧 メールで通知
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>読み込み中...</div>
      ) : lps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, background: 'white', borderRadius: 16, border: '2px dashed #E5E7EB' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📄</p>
          <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>LPがまだありません</p>
          <Link href={'/admin/stores/' + storeId + '/lp/new'} style={{ display: 'inline-block', background: '#7C3AED', color: 'white', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>最初のLPをAI生成する</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lps.map(lp => {
            const st = STATUS_LABEL[lp.status] || STATUS_LABEL.draft
            const a = analytics[lp.id]
            return (
              <div key={lp.id} style={{
                background: 'white', borderRadius: 14, padding: '16px 20px',
                border: lp.status === 'published' ? '2px solid #10B981' : '1px solid #F3F4F6',
                boxShadow: '0 1px 6px rgba(0,0,0,.06)',
              }}>
                {/* LP情報 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: a ? 14 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ background: st.color, color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{st.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lp.appeal_angle || '訴求角度未設定'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                      {lp.catch_copy || 'キャッチコピー未設定'} · {new Date(lp.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {slug && (
                      <button onClick={() => copyUrl(slug, lp.id)} style={{ background: '#F3F4F6', color: '#374151', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {copied === lp.id ? '✓ コピー' : '🔗 URLコピー'}
                      </button>
                    )}
                    {lp.status !== 'published' && (
                      <button onClick={() => changeStatus(lp, 'published')} disabled={actionId === lp.id} style={{ background: '#10B981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>公開する</button>
                    )}
                    {lp.status === 'published' && (
                      <button onClick={() => changeStatus(lp, 'archived')} disabled={actionId === lp.id} style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>アーカイブ</button>
                    )}
                    {lp.status === 'archived' && (
                      <button onClick={() => changeStatus(lp, 'draft')} disabled={actionId === lp.id} style={{ background: '#F3F4F6', color: '#6B7280', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>下書きに戻す</button>
                    )}
                  </div>
                </div>

                {/* パフォーマンス指標 */}
                {a && (
                  <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { label: 'LPビュー', value: a.lp_views.toLocaleString(), unit: '回' },
                      { label: 'LINE追加', value: a.line_adds.toLocaleString(), unit: '件' },
                      { label: 'CVR', value: a.cvr, unit: '%' },
                      { label: '稼働日数', value: String(a.days), unit: '日' },
                    ].map(({ label, value, unit }) => (
                      <div key={label} style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1F2937' }}>{value}<span style={{ fontSize: 10, fontWeight: 400, color: '#6B7280', marginLeft: 2 }}>{unit}</span></div>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1/-1', fontSize: 11, color: '#9CA3AF', textAlign: 'right' }}>
                      集計期間: {a.period_from} 〜 {a.period_to}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}