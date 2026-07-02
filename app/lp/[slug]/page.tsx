import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Phone, MapPin, Clock, Instagram, MessageCircle, Tag, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

interface Props { params: { slug: string } }

// hex → rgba（opacity付き）
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data: store } = await supabase
    .from('stores').select('store_name, industry').eq('slug', params.slug).single()
  if (!store) return { title: 'ページが見つかりません' }

  const { data: lp } = await supabase
    .from('lp_pages').select('seo_title, seo_description, catch_copy')
    .eq('store_id', (await supabase.from('stores').select('id').eq('slug', params.slug).single()).data?.id ?? '')
    .eq('status', 'published').limit(1).single()

  return {
    title: lp?.seo_title || store.store_name,
    description: lp?.seo_description || lp?.catch_copy || `${store.store_name}の公式ページ`,
  }
}

export default async function PublicLpPage({ params }: Props) {
  const supabase = createClient()

  const { data: store } = await supabase
    .from('stores').select('*').eq('slug', params.slug).single()
  if (!store) notFound()

  const { data: lp } = await supabase
    .from('lp_pages').select('*')
    .eq('store_id', store.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1).single()
  if (!lp) notFound()

  const { data: coupons } = lp.coupon_display
    ? await supabase.from('coupons').select('*').eq('store_id', store.id).eq('display_status', 'visible')
    : { data: [] }

  // フィールドの正規化（新旧両対応）
  const primaryColor = lp.primary_color || '#6366f1'
  const catchCopy    = lp.catch_copy || store.store_name
  const subCopy      = lp.sub_copy || null
  const lineBenefit  = lp.line_benefit || null
  const ctaText      = lp.line_cta_text || 'LINEで友だち追加する'
  const mainCtaText  = lp.cta_text || 'LINEで今すぐ予約・相談する'

  // 選ばれる理由: appeal_points 優先、なければ strengths
  const appealPoints: string[] = (lp.appeal_points && lp.appeal_points.length > 0)
    ? lp.appeal_points
    : (lp.strengths ?? [])

  // サービス（構造化）
  const services: { name: string; description: string; price?: string; tag?: string }[] =
    lp.services ?? []

  // 特徴
  const features: string[] = lp.features ?? []

  const testimonials: any[] = lp.testimonials ?? []
  const faq: any[]          = lp.faq ?? []

  const primaryLight = hexToRgba(primaryColor, 0.08)
  const primaryMid   = hexToRgba(primaryColor, 0.15)

  return (
    <div className="min-h-screen bg-white" style={{ '--primary': primaryColor } as React.CSSProperties}>

      {/* ===== HERO ===== */}
      <section
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${hexToRgba(primaryColor, 0.8)} 100%)` }}
      >
        {lp.main_image_url && (
          <>
            <img src={lp.main_image_url} alt={store.store_name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor}dd 0%, ${primaryColor}99 100%)` }} />
          </>
        )}
        <div className="relative max-w-xl mx-auto px-5 pt-12 pb-10 text-white text-center">
          <p className="text-sm font-semibold tracking-widest uppercase opacity-70 mb-3">{store.store_name}</p>
          <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight mb-4">
            {catchCopy}
          </h1>
          {subCopy && (
            <p className="text-base opacity-90 leading-relaxed mb-6">{subCopy}</p>
          )}

          {/* LINE特典バッジ */}
          {lineBenefit && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 text-sm font-medium mb-6">
              🎁 {lineBenefit}
            </div>
          )}

          {/* メインCTAボタン */}
          {lp.line_button_url && (
            <a
              href={lp.line_button_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full max-w-sm mx-auto rounded-2xl bg-white py-4 font-bold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
              style={{ color: primaryColor }}
            >
              <MessageCircle className="h-5 w-5" />
              {mainCtaText}
            </a>
          )}
        </div>
      </section>

      {/* ===== STICKY LINE CTA ===== */}
      {lp.line_button_url && (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b">
          <div className="max-w-xl mx-auto px-4 py-2.5">
            <a
              href={lp.line_button_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[.98]"
              style={{ backgroundColor: '#06C755' }}
            >
              <MessageCircle className="h-4 w-4" />
              {ctaText}
              {lineBenefit && <span className="text-xs opacity-80 font-normal">— {lineBenefit}</span>}
            </a>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pb-16 space-y-10 mt-8">

        {/* ===== LINE特典 + クーポン ===== */}
        {(lineBenefit || (coupons && coupons.length > 0)) && (
          <section>
            {lineBenefit && (
              <div
                className="rounded-2xl border-2 p-5 mb-4"
                style={{ borderColor: primaryColor, backgroundColor: primaryLight }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-5 w-5" style={{ color: primaryColor }} />
                  <p className="font-bold text-sm" style={{ color: primaryColor }}>LINE登録特典</p>
                </div>
                <p className="text-gray-800 font-semibold text-base">🎁 {lineBenefit}</p>
              </div>
            )}

            {coupons && coupons.length > 0 && (
              <div className="space-y-3">
                {coupons.map(c => (
                  <div key={c.id} className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4">
                    <p className="font-bold text-amber-800 text-base">{c.coupon_name}</p>
                    <p className="text-amber-700 text-sm mt-1">{c.discount_description}</p>
                    {c.usage_conditions && <p className="text-xs text-amber-600 mt-1">{c.usage_conditions}</p>}
                    {c.expiry_date && <p className="text-xs text-amber-600 mt-1">有効期限：{c.expiry_date}</p>}
                  </div>
                ))}
              </div>
            )}

            {lp.line_button_url && (
              <a
                href={lp.line_button_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-[#06C755] py-3.5 text-white font-bold hover:bg-[#05b34c] transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                LINEで特典を受け取る
              </a>
            )}
          </section>
        )}

        {/* ===== 選ばれる理由 ===== */}
        {appealPoints.filter(Boolean).length > 0 && (
          <section>
            <h2 className="text-xl font-black text-center mb-1">選ばれる理由</h2>
            <p className="text-sm text-gray-500 text-center mb-5">{store.store_name}が支持される3つのポイント</p>
            <div className="space-y-3">
              {appealPoints.filter(Boolean).map((point, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-2xl p-5"
                  style={{ backgroundColor: primaryLight }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-black text-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    0{i + 1}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug mt-1.5">{point}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== サービス・メニュー ===== */}
        {services.length > 0 && (
          <section>
            <h2 className="text-xl font-black mb-1">メニュー・料金</h2>
            <p className="text-sm text-gray-500 mb-5">すべて税込価格です</p>
            <div className="grid gap-3">
              {services.map((s, i) => (
                <div key={i} className="rounded-2xl border bg-white shadow-sm p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm">{s.name}</p>
                      {s.tag && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {s.tag}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>
                    )}
                  </div>
                  {s.price && (
                    <p className="font-bold text-sm shrink-0" style={{ color: primaryColor }}>
                      {s.price}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {lp.pricing && (
              <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                <pre className="text-sm text-gray-700 font-sans whitespace-pre-wrap">{lp.pricing}</pre>
              </div>
            )}
          </section>
        )}

        {/* pricing のみある場合（servicesなし） */}
        {services.length === 0 && lp.pricing && (
          <section>
            <h2 className="text-xl font-black mb-5">料金・メニュー</h2>
            <div className="rounded-2xl bg-gray-50 p-5">
              <pre className="text-sm text-gray-700 font-sans whitespace-pre-wrap">{lp.pricing}</pre>
            </div>
          </section>
        )}

        {/* ===== 特徴 ===== */}
        {features.filter(Boolean).length > 0 && (
          <section>
            <h2 className="text-xl font-black mb-5">こだわり・特徴</h2>
            <div className="grid grid-cols-1 gap-2">
              {features.filter(Boolean).map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <CheckCircle className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                  <p className="text-sm font-medium text-gray-800">{f}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== サービス説明 ===== */}
        {lp.service_description && (
          <section>
            <h2 className="text-xl font-black mb-5">サービスについて</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{lp.service_description}</p>
          </section>
        )}

        {/* ===== お客様の声 ===== */}
        {testimonials.length > 0 && (
          <section>
            <h2 className="text-xl font-black mb-5">お客様の声</h2>
            <div className="space-y-3">
              {testimonials.map((t, i) => (
                <div key={i} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-0.5 mb-2">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className={j < (t.rating ?? 5) ? 'text-amber-400 text-lg' : 'text-gray-200 text-lg'}>★</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">"{t.content}"</p>
                  <p className="text-xs text-gray-400 mt-3">{t.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== よくある質問 ===== */}
        {faq.length > 0 && (
          <section>
            <h2 className="text-xl font-black mb-5">よくある質問</h2>
            <div className="space-y-2">
              {faq.map((item, i) => (
                <details key={i} className="rounded-2xl border overflow-hidden group">
                  <summary className="cursor-pointer px-5 py-4 font-semibold text-sm select-none flex items-center justify-between list-none">
                    Q. {item.question}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform shrink-0">▼</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t bg-gray-50 pt-3">
                    A. {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ===== アクセス ===== */}
        {(lp.access_info || lp.business_hours || lp.phone_number || store.phone_number || store.address) && (
          <section>
            <h2 className="text-xl font-black mb-5">アクセス・店舗情報</h2>
            <div className="rounded-2xl border divide-y overflow-hidden">
              {(lp.access_info || store.address) && (
                <div className="flex items-start gap-3 p-4">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                  <p className="text-sm text-gray-700">{lp.access_info || store.address}</p>
                </div>
              )}
              {(lp.business_hours || store.business_hours) && (
                <div className="flex items-start gap-3 p-4">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0 text-gray-500" />
                  <p className="text-sm text-gray-700 whitespace-pre-line">{lp.business_hours || store.business_hours}</p>
                </div>
              )}
              {(lp.phone_number || store.phone_number) && (
                <div className="flex items-center gap-3 p-4">
                  <Phone className="h-4 w-4 shrink-0 text-gray-500" />
                  <a href={`tel:${lp.phone_number || store.phone_number}`} className="text-sm font-semibold hover:underline" style={{ color: primaryColor }}>
                    {lp.phone_number || store.phone_number}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===== Googleマップ ===== */}
        {lp.google_map_embed && (
          <section>
            <h2 className="text-xl font-black mb-4">地図</h2>
            <div
              className="rounded-2xl overflow-hidden w-full aspect-video shadow-sm"
              dangerouslySetInnerHTML={{
                __html: lp.google_map_embed
                  .replace(/width="[^"]*"/, 'width="100%"')
                  .replace(/height="[^"]*"/, 'height="100%"')
              }}
            />
          </section>
        )}

        {/* ===== SNS ===== */}
        {lp.instagram_url && (
          <section>
            <a
              href={lp.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-2xl border py-3.5 text-sm font-semibold hover:bg-gray-50 transition-colors text-gray-700"
            >
              <Instagram className="h-4 w-4" />
              Instagramをフォローする
            </a>
          </section>
        )}

        {/* ===== 最終CTA ===== */}
        <section className="pt-4 space-y-3">
          {lp.line_button_url && (
            <a
              href={lp.line_button_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full rounded-2xl py-5 text-white font-bold text-base shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all active:scale-[.98]"
              style={{ backgroundColor: '#06C755' }}
            >
              <MessageCircle className="h-5 w-5" />
              {mainCtaText}
            </a>
          )}
          {(lp.phone_number || store.phone_number) && (
            <a
              href={`tel:${lp.phone_number || store.phone_number}`}
              className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 py-4 font-bold text-base hover:bg-gray-50 transition-colors"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <Phone className="h-5 w-5" />
              電話で問い合わせる
            </a>
          )}
          {lineBenefit && (
            <p className="text-xs text-center text-gray-400">🎁 LINE登録で {lineBenefit}</p>
          )}
        </section>
      </div>

      {/* ===== Footer ===== */}
      <footer className="border-t py-8 text-center text-xs text-gray-400 bg-gray-50">
        <p className="font-semibold text-gray-600">{store.store_name}</p>
        {store.address && <p className="mt-1">{store.address}</p>}
        <p className="mt-3 text-gray-300">Powered by 1Page Studio</p>
      </footer>
    </div>
  )
}
