import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: store } = await supabase.from('stores').select('store_name').eq('slug', params.slug).single()
  if (!store) return { title: 'ページが見つかりません' }
  const { data: lp } = await supabase.from('lp_pages').select('seo_title,seo_description,catch_copy').eq('status','published').eq('store_id', store.id ?? '').single()
  return { title: lp?.seo_title || store.store_name, description: lp?.seo_description || lp?.catch_copy || store.store_name }
}

export default async function LpPublicPage({ params }: Props) {
  const supabase = createClient()
  const { data: store } = await supabase.from('stores').select('*').eq('slug', params.slug).single()
  if (!store) notFound()

  const { data: lp } = await supabase
    .from('lp_pages').select('*').eq('store_id', store.id).eq('status','published').is('deleted_at', null)
    .order('updated_at', { ascending: false }).limit(1).single()
  if (!lp) notFound()

  // クーポンをcouponsテーブルから取得
  const { data: coupons } = lp.coupon_display
    ? await supabase.from('coupons').select('title,description,discount_value,discount_type,valid_until').eq('store_id', store.id).eq('status','active').order('created_at', { ascending: false }).limit(3)
    : { data: null }

  const primary = lp.primary_color || '#7C3AED'
  const accent = lp.accent_color || '#EC4899'
  const strengths: string[] = Array.isArray(lp.strengths) ? lp.strengths : []
  const appealPoints: string[] = Array.isArray(lp.appeal_points) ? lp.appeal_points : []
  const services: any[] = Array.isArray(lp.services) ? lp.services : []
  const testimonials: any[] = Array.isArray(lp.testimonials) ? lp.testimonials : []
  const faq: any[] = Array.isArray(lp.faq) ? lp.faq : []

  return (
    <div style={{ fontFamily: "'Hiragino Sans','Noto Sans JP',sans-serif", background: '#FAFAFA', minHeight: '100vh' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        .line-btn{display:flex;align-items:center;justify-content:center;gap:10px;background:#06C755;color:white;font-size:17px;font-weight:700;padding:18px 24px;border-radius:50px;text-decoration:none;box-shadow:0 4px 20px rgba(6,199,85,.4);width:100%;max-width:380px;margin:0 auto;letter-spacing:.02em}
        .section{padding:48px 20px}
        .inner{max-width:600px;margin:0 auto}
        .section-title{font-size:20px;font-weight:800;text-align:center;margin-bottom:6px}
        .section-sub{font-size:12px;color:#999;text-align:center;margin-bottom:28px;letter-spacing:.08em}
        .card{background:white;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.06)}
        @media(min-width:640px){.section{padding:64px 40px}}
      `}</style>

      {/* Header Image */}
      {lp.header_image_url && (
        <div style={{width:'100%',maxHeight:400,overflow:'hidden',lineHeight:0}}>
          <img
            src={lp.header_image_url}
            alt={lp.catch_copy || store.store_name}
            style={{width:'100%',height:'100%',maxHeight:400,objectFit:'cover'}}
          />
        </div>
      )}
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${primary} 0%,${accent} 100%)`,color:'white',padding:'60px 24px 52px',textAlign:'center'}}>
        <p style={{fontSize:12,fontWeight:600,opacity:.75,marginBottom:14,letterSpacing:'.1em',textTransform:'uppercase'}}>{store.store_name}</p>
        <h1 style={{fontSize:30,fontWeight:900,lineHeight:1.3,marginBottom:14}}>{lp.catch_copy || store.store_name}</h1>
        {lp.sub_copy && <p style={{fontSize:15,opacity:.9,marginBottom:28,lineHeight:1.6}}>{lp.sub_copy}</p>}
        {appealPoints.length > 0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:32}}>
            {appealPoints.map((p:string,i:number)=>(
              <span key={i} style={{background:'rgba(255,255,255,.2)',backdropFilter:'blur(4px)',borderRadius:20,padding:'5px 13px',fontSize:13,fontWeight:600}}>✓ {p}</span>
            ))}
          </div>
        )}
        {lp.line_button_url ? (
          <div>
            <a href={lp.line_button_url} target="_blank" rel="noopener noreferrer" className="line-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              {lp.line_cta_text || 'LINEで予約・お問い合わせ'}
            </a>
            {lp.line_benefit && <p style={{fontSize:13,marginTop:10,opacity:.85,textAlign:'center'}}>🎁 {lp.line_benefit}</p>}
          </div>
        ) : lp.phone_number ? (
          <a href={`tel:${lp.phone_number}`} style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.15)',border:'2px solid rgba(255,255,255,.6)',color:'white',padding:'16px 32px',borderRadius:50,fontWeight:800,fontSize:16,textDecoration:'none'}}>
            📞 {lp.phone_number}
          </a>
        ) : null}
      </div>

      {/* クーポン */}
      {lp.coupon_display && coupons && coupons.length > 0 && (
        <div style={{background:'#FFF7ED',borderTop:'3px solid #F97316',borderBottom:'3px solid #F97316',padding:'20px 24px'}}>
          {coupons.map((c:any,i:number)=>(
            <div key={i} style={{textAlign:'center',marginBottom: i < coupons.length-1 ? 16 : 0}}>
              <div style={{fontSize:11,fontWeight:700,color:'#EA580C',letterSpacing:'.1em',marginBottom:4}}>🎫 {i===0?'今だけ！限定クーポン':'クーポン'}</div>
              <div style={{fontSize:17,fontWeight:900,color:'#9A3412'}}>{c.title}</div>
              {c.description && <div style={{fontSize:14,color:'#92400E',marginTop:4}}>{c.description}</div>}
              {c.valid_until && <div style={{fontSize:12,color:'#B45309',marginTop:4}}>有効期限: {new Date(c.valid_until).toLocaleDateString('ja-JP')}</div>}
            </div>
          ))}
        </div>
      )}

      {/* サービス説明 */}
      {lp.service_description && (
        <div className="section" style={{background:'white'}}>
          <div className="inner">
            <div className="section-title">サービス紹介</div>
            <div className="section-sub">ABOUT US</div>
            <p style={{fontSize:15,lineHeight:1.9,color:'#374151',textAlign:'center'}}>{lp.service_description}</p>
          </div>
        </div>
      )}

      {/* 選ばれる理由 */}
      {strengths.length > 0 && (
        <div className="section" style={{background:'#F9FAFB'}}>
          <div className="inner">
            <div className="section-title">選ばれる理由</div>
            <div className="section-sub">WHY CHOOSE US</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {strengths.map((s:string,i:number)=>(
                <div key={i} className="card" style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${primary},${accent})`,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:15,flexShrink:0}}>{i+1}</div>
                  <p style={{fontSize:15,fontWeight:600,color:'#1F2937',lineHeight:1.5}}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* メニュー */}
      {services.length > 0 && (
        <div className="section" style={{background:'white'}}>
          <div className="inner">
            <div className="section-title">メニュー</div>
            <div className="section-sub">MENU</div>
            <div style={{display:'flex',flexDirection:'column'}}>
              {services.map((s:any,i:number)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid #F3F4F6'}}>
                  <span style={{fontSize:15,color:'#374151'}}>{s.name||s}</span>
                  {s.price&&<span style={{fontSize:15,fontWeight:700,color:primary}}>¥{Number(s.price).toLocaleString()}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* お客様の声 */}
      {testimonials.length > 0 && (
        <div className="section" style={{background:'#F9FAFB'}}>
          <div className="inner">
            <div className="section-title">お客様の声</div>
            <div className="section-sub">REVIEWS</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {testimonials.map((t:any,i:number)=>(
                <div key={i} className="card">
                  <div style={{color:'#FBBF24',marginBottom:8}}>★★★★★</div>
                  <p style={{fontSize:14,color:'#374151',lineHeight:1.75,marginBottom:8}}>{t.content||t}</p>
                  {t.name&&<p style={{fontSize:13,color:'#6B7280',fontWeight:600}}>— {t.name}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* よくある質問 */}
      {faq.length > 0 && (
        <div className="section" style={{background:'white'}}>
          <div className="inner">
            <div className="section-title">よくある質問</div>
            <div className="section-sub">FAQ</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {faq.map((f:any,i:number)=>(
                <div key={i} className="card">
                  <p style={{fontSize:15,fontWeight:700,color:primary,marginBottom:8}}>Q. {f.q||f.question}</p>
                  <p style={{fontSize:14,color:'#374151',lineHeight:1.7}}>A. {f.a||f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 店舗情報 */}
      <div className="section" style={{background:'#F9FAFB'}}>
        <div className="inner">
          <div className="section-title">店舗情報</div>
          <div className="section-sub">SHOP INFO</div>
          <div className="card" style={{display:'flex',flexDirection:'column',gap:16}}>
            {lp.business_hours&&<div style={{display:'flex',gap:12,alignItems:'flex-start'}}><span style={{fontSize:22}}>🕐</span><div><div style={{fontSize:11,color:'#9CA3AF',marginBottom:3}}>営業時間</div><div style={{fontSize:15,fontWeight:600,color:'#1F2937'}}>{lp.business_hours}</div></div></div>}
            {lp.phone_number&&<div style={{display:'flex',gap:12,alignItems:'flex-start'}}><span style={{fontSize:22}}>📞</span><div><div style={{fontSize:11,color:'#9CA3AF',marginBottom:3}}>電話番号</div><a href={`tel:${lp.phone_number}`} style={{fontSize:15,fontWeight:700,color:primary,textDecoration:'none'}}>{lp.phone_number}</a></div></div>}
            {lp.access_info&&<div style={{display:'flex',gap:12,alignItems:'flex-start'}}><span style={{fontSize:22}}>📍</span><div><div style={{fontSize:11,color:'#9CA3AF',marginBottom:3}}>アクセス</div><div style={{fontSize:14,color:'#374151',lineHeight:1.6}}>{lp.access_info}</div></div></div>}
            {lp.instagram_url&&<div style={{display:'flex',gap:12,alignItems:'center'}}><span style={{fontSize:22}}>📸</span><div><div style={{fontSize:11,color:'#9CA3AF',marginBottom:3}}>Instagram</div><a href={lp.instagram_url} target="_blank" rel="noopener noreferrer" style={{fontSize:14,color:primary,textDecoration:'none'}}>インスタをフォローする →</a></div></div>}
          </div>
          {lp.google_map_embed&&<div style={{marginTop:16,borderRadius:12,overflow:'hidden'}} dangerouslySetInnerHTML={{__html:lp.google_map_embed}}/>}
        </div>
      </div>

      {/* 最終CTA */}
      <div style={{background:`linear-gradient(135deg,${primary},${accent})`,padding:'52px 24px',textAlign:'center'}}>
        <h2 style={{fontSize:23,fontWeight:900,color:'white',marginBottom:8}}>まずはお気軽にご相談を</h2>
        <p style={{fontSize:14,color:'rgba(255,255,255,.8)',marginBottom:28}}>予約・お問い合わせは無料です</p>
        {lp.line_button_url?(
          <a href={lp.line_button_url} target="_blank" rel="noopener noreferrer" className="line-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            {lp.line_cta_text||'LINEで予約する'}
          </a>
        ):lp.phone_number?(
          <a href={`tel:${lp.phone_number}`} style={{display:'inline-flex',alignItems:'center',gap:8,background:'white',color:primary,padding:'16px 32px',borderRadius:50,fontWeight:800,fontSize:17,textDecoration:'none'}}>
            📞 {lp.phone_number}
          </a>
        ):null}
      </div>

      {/* フッター */}
      <div style={{background:'#111',color:'#666',padding:'20px 24px',textAlign:'center',fontSize:12}}>
        <div style={{marginBottom:4,color:'#999'}}>{store.store_name}</div>
        <div>Powered by <span style={{color:'#A78BFA'}}>1Page Studio</span></div>
      </div>
    </div>
  )
}
