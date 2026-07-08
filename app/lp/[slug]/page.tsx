import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { LpViewTracker, LpLineButton } from '@/components/lp-tracker'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: store } = await supabase
    .from('stores').select('store_name').eq('slug', params.slug).single()
  if (!store) return { title: 'ページが見つかりません' }
  const { data: lp } = await supabase
    .from('lp_pages').select('seo_title,seo_description,catch_copy')
    .eq('status', 'published').eq('store_id', store.id ?? '').single()
  return {
    title: lp?.seo_title || store.store_name,
    description: lp?.seo_description || lp?.catch_copy || store.store_name,
  }
}

function LineSVG() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

export default async function LpPublicPage({ params }: Props) {
  const supabase = createClient()
  const { data: store } = await supabase
    .from('stores').select('*').eq('slug', params.slug).single()
  if (!store) notFound()

  const { data: lp } = await supabase
    .from('lp_pages').select('*')
    .eq('store_id', store.id).eq('status', 'published').is('deleted_at', null)
    .order('updated_at', { ascending: false }).limit(1).single()
  if (!lp) notFound()

  const { data: coupons } = lp.coupon_display
    ? await supabase
        .from('coupons')
        .select('title,description,discount_value,discount_type,valid_until')
        .eq('store_id', store.id).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(3)
    : { data: null }

  const primary = lp.primary_color || '#7C3AED'
  const accent  = lp.accent_color  || '#EC4899'

  const strengths:   string[] = Array.isArray(lp.strengths)    ? lp.strengths    : []
  const appealPoints:string[] = Array.isArray(lp.appeal_points)? lp.appeal_points: []
  const services:    any[]    = Array.isArray(lp.services)      ? lp.services     : []
  const testimonials:any[]    = Array.isArray(lp.testimonials)  ? lp.testimonials : []
  const faq:         any[]    = Array.isArray(lp.faq)           ? lp.faq          : []

  const hasLine   = !!lp.line_button_url
  const hasPhone  = !!lp.phone_number
  const hasCta    = hasLine || hasPhone
  const hasShopInfo = lp.business_hours || lp.phone_number || lp.access_info || lp.instagram_url

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{-webkit-font-smoothing:antialiased;font-family:'Hiragino Sans','Noto Sans JP',sans-serif}
    .lbtn{display:flex;align-items:center;justify-content:center;gap:10px;background:#06C755;color:#fff;font-size:17px;font-weight:700;padding:17px 24px;border-radius:50px;text-decoration:none;box-shadow:0 4px 24px rgba(6,199,85,.45);width:100%;max-width:380px;margin:0 auto;letter-spacing:.02em;-webkit-tap-highlight-color:transparent}
    .lbtn:active{opacity:.9}
    .pbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.15);border:2px solid rgba(255,255,255,.6);color:#fff;padding:16px 32px;border-radius:50px;font-weight:800;font-size:16px;text-decoration:none;-webkit-tap-highlight-color:transparent}
    .sticky{position:fixed;bottom:0;left:0;right:0;z-index:200;background:rgba(255,255,255,.96);backdrop-filter:blur(12px);padding:10px 16px 14px;border-top:1px solid #E5E7EB;box-shadow:0 -4px 24px rgba(0,0,0,.1)}
    .sticky .lbtn{max-width:100%;font-size:16px;padding:15px 20px}
    .sec{padding:52px 20px}
    .inner{max-width:600px;margin:0 auto}
    .eyebrow{font-size:11px;font-weight:700;letter-spacing:.15em;color:${primary};text-align:center;margin-bottom:6px;text-transform:uppercase}
    .heading{font-size:22px;font-weight:900;text-align:center;color:#111827;margin-bottom:4px;line-height:1.3}
    .heading span{background:linear-gradient(135deg,${primary},${accent});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .divider{width:40px;height:3px;background:linear-gradient(90deg,${primary},${accent});border-radius:2px;margin:12px auto 28px}
    .card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 16px rgba(0,0,0,.06)}
    .str-card{background:#fff;border-radius:16px;padding:18px 18px 18px 16px;box-shadow:0 2px 16px rgba(0,0,0,.06);display:flex;align-items:flex-start;gap:14px;border-left:3px solid ${primary}}
    .str-num{width:36px;height:36px;min-width:36px;border-radius:50%;background:linear-gradient(135deg,${primary},${accent});color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;flex-shrink:0}
    .svc-card{background:#fff;border-radius:16px;padding:18px;box-shadow:0 2px 16px rgba(0,0,0,.06);position:relative;overflow:hidden}
    .svc-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${primary},${accent})}
    .svc-tag{display:inline-block;background:linear-gradient(135deg,${primary},${accent});color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:10px;letter-spacing:.03em}
    .svc-price{font-size:19px;font-weight:900;background:linear-gradient(135deg,${primary},${accent});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;white-space:nowrap;margin-top:2px}
    .rev-card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 16px rgba(0,0,0,.06);position:relative;overflow:hidden}
    .rev-card::before{content:'"';position:absolute;top:-8px;left:14px;font-size:72px;line-height:1;color:${primary};opacity:.1;font-family:Georgia,serif;pointer-events:none}
    .stars{color:#FBBF24;font-size:14px;margin-bottom:10px;letter-spacing:2px}
    details{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05)}
    details+details{margin-top:10px}
    summary{padding:18px 48px 18px 18px;font-size:15px;font-weight:700;color:#1F2937;cursor:pointer;list-style:none;position:relative;line-height:1.5}
    summary::-webkit-details-marker{display:none}
    summary::after{content:'+';position:absolute;right:18px;top:50%;transform:translateY(-50%);font-size:22px;color:${primary};font-weight:300;line-height:1;transition:transform .25s}
    details[open]>summary::after{transform:translateY(-50%) rotate(45deg)}
    details[open]>summary{color:${primary}}
    .faq-ans{padding:0 18px 18px;font-size:14px;color:#4B5563;line-height:1.85;border-top:1px solid #F3F4F6}
    .faq-ans p{padding-top:14px}
    .info-row{display:flex;gap:12px;align-items:flex-start;padding:14px 0;border-bottom:1px solid #F3F4F6}
    .info-row:last-child{border-bottom:none}
    .info-icon{width:38px;height:38px;min-width:38px;border-radius:10px;background:linear-gradient(135deg,${primary}22,${accent}22);display:flex;align-items:center;justify-content:center;font-size:18px}
    @media(min-width:640px){.sec{padding:72px 40px}}
  `

  return (
    <div style={{ fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif", background: '#FAFAFA', minHeight: '100vh', paddingBottom: hasCta ? 80 : 0 }}>
      <style>{css}</style>
              <LpViewTracker slug={lp.slug} />

      {lp.header_image_url && (
        <div style={{ width: '100%', maxHeight: 420, overflow: 'hidden', lineHeight: 0, position: 'relative' }}>
          <img src={lp.header_image_url} alt={lp.catch_copy || store.store_name} style={{ width: '100%', height: '100%', maxHeight: 420, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom,transparent 40%,${primary}88)` }} />
        </div>
      )}

      <div style={{ background: `linear-gradient(160deg,${primary} 0%,${accent} 100%)`, color: '#fff', padding: '60px 24px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-25%', left: '-8%', width: '48%', paddingBottom: '48%', borderRadius: '50%', background: 'rgba(255,255,255,.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-4%', width: '38%', paddingBottom: '38%', borderRadius: '50%', background: 'rgba(255,255,255,.09)', pointerEvents: 'none' }} />
        <p style={{ fontSize: 12, fontWeight: 700, opacity: .72, marginBottom: 18, letterSpacing: '.14em', textTransform: 'uppercase', position: 'relative' }}>{store.store_name}</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.25, marginBottom: 18, position: 'relative', letterSpacing: '-.01em', textShadow: '0 2px 12px rgba(0,0,0,.15)' }}>{lp.catch_copy || store.store_name}</h1>
        {lp.sub_copy && <p style={{ fontSize: 15, opacity: .88, marginBottom: 28, lineHeight: 1.75, position: 'relative', maxWidth: 480, margin: '0 auto 28px' }}>{lp.sub_copy}</p>}
        {appealPoints.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32, position: 'relative' }}>
            {appealPoints.map((p: string, i: number) => (
              <span key={i} style={{ background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 600, letterSpacing: '.02em' }}>✓ {p}</span>
            ))}
          </div>
        )}
        <div style={{ position: 'relative' }}>
          {hasLine ? (
            <>
              <a href={lp.line_button_url} target="_blank" rel="noopener noreferrer" className="lbtn"><LineSVG />{lp.line_cta_text || 'LINEで予約・お問い合わせ'}</a>
              {lp.line_benefit && <div style={{ marginTop: 12, fontSize: 13, opacity: .85, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><span>🎁</span><span>{lp.line_benefit}</span></div>}
            </>
          ) : hasPhone ? (
            <a href={`tel:${lp.phone_number}`} className="pbtn">📞 {lp.phone_number}</a>
          ) : null}
        </div>
      </div>

      {lp.coupon_display && coupons && coupons.length > 0 && (
        <div style={{ background: 'linear-gradient(90deg,#FFF7ED,#FFFBEB)', borderTop: '3px dashed #F97316', borderBottom: '3px dashed #F97316', padding: '20px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 11, fontWeight: 700, color: '#EA580C', letterSpacing: '.1em' }}>🎫 期間限定クーポン</div>
          {coupons.map((c: any, i: number) => (
            <div key={i} style={{ textAlign: 'center', marginTop: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#9A3412' }}>{c.title}</div>
              {c.description && <div style={{ fontSize: 14, color: '#92400E', marginTop: 4 }}>{c.description}</div>}
              {c.valid_until && <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>有効期限 {new Date(c.valid_until).toLocaleDateString('ja-JP')}</div>}
            </div>
          ))}
        </div>
      )}

      {lp.service_description && (
        <div className="sec" style={{ background: '#fff' }}>
          <div className="inner">
            <div className="eyebrow">About Us</div>
            <h2 className="heading">私たちについて</h2>
            <div className="divider" />
            <p style={{ fontSize: 15, lineHeight: 1.95, color: '#374151', textAlign: 'center' }}>{lp.service_description}</p>
          </div>
        </div>
      )}

      {strengths.length > 0 && (
        <div className="sec" style={{ background: '#F9FAFB' }}>
          <div className="inner">
            <div className="eyebrow">Why Choose Us</div>
            <h2 className="heading"><span>選ばれる理由</span></h2>
            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {strengths.map((s: string, i: number) => (
                <div key={i} className="str-card">
                  <div className="str-num">{i + 1}</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1F2937', lineHeight: 1.65, paddingTop: 6 }}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="sec" style={{ background: '#fff' }}>
          <div className="inner">
            <div className="eyebrow">Menu</div>
            <h2 className="heading"><span>メニュー</span></h2>
            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {services.map((s: any, i: number) => {
                const name  = typeof s === 'string' ? s : (s.name || '')
                const desc  = typeof s === 'string' ? '' : (s.description || '')
                const price = typeof s === 'string' ? '' : (s.price || '')
                const tag   = typeof s === 'string' ? '' : (s.tag || '')
                return (
                  <div key={i} className="svc-card">
                    {tag && <div className="svc-tag">{tag}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: desc ? 6 : 0, lineHeight: 1.4 }}>{name}</div>
                        {desc && <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>{desc}</div>}
                      </div>
                      {price && <div className="svc-price">{price}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {testimonials.length > 0 && (
        <div className="sec" style={{ background: '#F9FAFB' }}>
          <div className="inner">
            <div className="eyebrow">Reviews</div>
            <h2 className="heading"><span>お客様の声</span></h2>
            <div className="divider" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {testimonials.map((t: any, i: number) => {
                const content = typeof t === 'string' ? t : (t.content || '')
                const name    = typeof t === 'string' ? '' : (t.name || '')
                const rating  = typeof t === 'object' ? Math.min(t.rating || 5, 5) : 5
                return (
                  <div key={i} className="rev-card">
                    <div className="stars">{'★'.repeat(rating)}</div>
                    <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.85, marginBottom: name ? 12 : 0 }}>{content}</p>
                    {name && <p style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>— {name}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {faq.length > 0 && (
        <div className="sec" style={{ background: '#fff' }}>
          <div className="inner">
            <div className="eyebrow">FAQ</div>
            <h2 className="heading"><span>よくある質問</span></h2>
            <div className="divider" />
            {faq.map((f: any, i: number) => {
              const q = typeof f === 'object' ? (f.q || f.question || '') : String(f)
              const a = typeof f === 'object' ? (f.a || f.answer || '') : ''
              return (
                <details key={i}>
                  <summary>Q. {q}</summary>
                  <div className="faq-ans"><p>A. {a}</p></div>
                </details>
              )
            })}
          </div>
        </div>
      )}

      {hasShopInfo && (
        <div className="sec" style={{ background: '#F9FAFB' }}>
          <div className="inner">
            <div className="eyebrow">Shop Info</div>
            <h2 className="heading">店舗情報</h2>
            <div className="divider" />
            <div className="card" style={{ padding: '4px 20px' }}>
              {lp.business_hours && (
                <div className="info-row">
                  <div className="info-icon">🕐</div>
                  <div><div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>営業時間</div><div style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>{lp.business_hours}</div></div>
                </div>
              )}
              {lp.phone_number && (
                <div className="info-row">
                  <div className="info-icon">📞</div>
                  <div><div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>電話番号</div><a href={`tel:${lp.phone_number}`} style={{ fontSize: 16, fontWeight: 700, color: primary, textDecoration: 'none' }}>{lp.phone_number}</a></div>
                </div>
              )}
              {lp.access_info && (
                <div className="info-row">
                  <div className="info-icon">📍</div>
                  <div><div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>アクセス</div><div style={{ fontSize: 14, color: '#374151', lineHeight: 1.65 }}>{lp.access_info}</div></div>
                </div>
              )}
              {lp.instagram_url && (
                <div className="info-row">
                  <div className="info-icon">📸</div>
                  <div><div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>Instagram</div><a href={lp.instagram_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: primary, textDecoration: 'none', fontWeight: 600 }}>インスタをフォロー →</a></div>
                </div>
              )}
            </div>
            {lp.google_map_embed && <div style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: lp.google_map_embed }} />}
          </div>
        </div>
      )}

      <div style={{ background: `linear-gradient(160deg,${primary} 0%,${accent} 100%)`, padding: '56px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: '40%', paddingBottom: '40%', borderRadius: '50%', background: 'rgba(255,255,255,.08)', pointerEvents: 'none' }} />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', marginBottom: 10, letterSpacing: '.06em' }}>✦ まずはお気軽にどうぞ ✦</p>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>ご予約・お問い合わせ</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.78)', marginBottom: 28 }}>お問い合わせは無料です</p>
        {hasLine ? (
          <>
            <a href={lp.line_button_url} target="_blank" rel="noopener noreferrer" className="lbtn"><LineSVG />{lp.line_cta_text || 'LINEで予約する'}</a>
            {lp.line_benefit && <p style={{ color: 'rgba(255,255,255,.82)', fontSize: 13, marginTop: 12 }}>🎁 {lp.line_benefit}</p>}
          </>
        ) : hasPhone ? (
          <a href={`tel:${lp.phone_number}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: primary, padding: '16px 32px', borderRadius: 50, fontWeight: 800, fontSize: 17, textDecoration: 'none' }}>📞 {lp.phone_number}</a>
        ) : null}
      </div>

      <div style={{ background: '#111', color: '#555', padding: '24px', textAlign: 'center', fontSize: 12 }}>
        <div style={{ color: '#888', marginBottom: 6, fontWeight: 600 }}>{store.store_name}</div>
        <div>Powered by <span style={{ color: '#A78BFA', fontWeight: 700 }}>1Page Studio</span></div>
      </div>

      {hasLine && (
        <div className="sticky">
          <a href={lp.line_button_url} target="_blank" rel="noopener noreferrer" className="lbtn"><LineSVG />{lp.line_cta_text || 'LINEで予約する'}</a>
        </div>
      )}
    </div>
  )
}
