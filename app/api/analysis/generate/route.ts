import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// ----------------------------------------------------------------
// Build a rich context string from store data for the AI prompt
// ----------------------------------------------------------------
async function buildStoreContext(supabase: any, storeId: string) {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

  const [
    { data: store },
    { data: lp },
    { data: reports },
    { data: inquiries },
    { data: coupons },
    { data: milestones },
    { data: connections },
  ] = await Promise.all([
    supabase.from('stores').select('store_name, industry, phone_number, address').eq('id', storeId).single(),
    supabase.from('lp_pages').select('catch_copy, line_button_url, status, created_at').eq('store_id', storeId).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('ad_daily_reports').select('date,clicks,lp_views,line_adds,inquiries,reservations,coupon_uses,sales,cost').eq('store_id', storeId).gte('date', fromDate).order('date', { ascending: false }),
    supabase.from('inquiries').select('id,status,created_at').eq('store_id', storeId).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('coupons').select('id,coupon_name,usage_count,display_status').eq('store_id', storeId).is('deleted_at', null),
    supabase.from('store_milestones').select('title,category,metric_label,metric_value,happened_at').eq('store_id', storeId).gte('happened_at', fromDate).order('happened_at', { ascending: false }).limit(5),
    supabase.from('ad_accounts').select('platform,connection_status,last_synced_at').eq('store_id', storeId).eq('connection_status', 'connected'),
  ])

  // Aggregate ad stats
  const stats = (reports || []).reduce((acc: any, r: any) => ({
    clicks: acc.clicks + (r.clicks || 0),
    lp_views: acc.lp_views + (r.lp_views || 0),
    line_adds: acc.line_adds + (r.line_adds || 0),
    inquiries_count: acc.inquiries_count + (r.inquiries || 0),
    reservations: acc.reservations + (r.reservations || 0),
    coupon_uses: acc.coupon_uses + (r.coupon_uses || 0),
    sales: acc.sales + (r.sales || 0),
    cost: acc.cost + (r.cost || 0),
  }), { clicks: 0, lp_views: 0, line_adds: 0, inquiries_count: 0, reservations: 0, coupon_uses: 0, sales: 0, cost: 0 })

  const lpToLine = stats.lp_views > 0 ? ((stats.line_adds / stats.lp_views) * 100).toFixed(1) : 'N/A'
  const roas = stats.cost > 0 ? (stats.sales / stats.cost).toFixed(2) : 'N/A'
  const uninquiries = (inquiries || []).filter((i: any) => i.status === 'new').length
  const connectedPlatforms = (connections || []).map((c: any) => c.platform).join(', ') || 'なし'
  const activeCoupons = (coupons || []).filter((c: any) => c.display_status === 'visible').length
  const totalCouponUses = (coupons || []).reduce((sum: number, c: any) => sum + (c.usage_count || 0), 0)

  return `
店舗名: ${store?.store_name || '不明'}
業種: ${store?.industry || '不明'}

【過去30日の指標】
- 広告クリック: ${stats.clicks}
- LP閲覧: ${stats.lp_views}
- LINE登録: ${stats.line_adds}（LP→LINE転換率: ${lpToLine}%）
- 問い合わせ: ${stats.inquiries_count}件
- 予約: ${stats.reservations}件
- クーポン使用: ${stats.coupon_uses}件
- 売上: ¥${stats.sales.toLocaleString()}
- 広告費: ¥${stats.cost.toLocaleString()}（費用対効果: ${roas}）

【問い合わせ管理】
- 総問い合わせ: ${inquiries?.length || 0}件（未対応: ${uninquiries}件）

【クーポン状況】
- 公開中クーポン: ${activeCoupons}件
- 累計使用数: ${totalCouponUses}件

【LP状況】
- キャッチコピー: ${lp?.catch_copy || '未設定'}
- LINE連携: ${lp?.line_button_url ? '設定済み' : '未設定'}
- LP状態: ${lp?.status || '未公開'}

【連携サービス】
${connectedPlatforms}

【最近の改善履歴（30日以内）】
${(milestones || []).map((m: any) => `- ${m.happened_at}: ${m.title}${m.metric_value ? ` (${m.metric_label}: ${m.metric_value})` : ''}`).join('\n') || 'なし'}
`.trim()
}

// ----------------------------------------------------------------
// POST /api/analysis/generate
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await request.json()
  const { storeId, date } = body
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const analysisDate = date ?? new Date().toISOString().split('T')[0]

  try {
    const context = await buildStoreContext(supabase, storeId)

    const systemPrompt = `あなたは飲食・美容・健康系の中小店舗向けマーケティングアドバイザーです。
提供された店舗データを分析し、以下のJSON形式で回答してください。
回答は必ず日本語で、店舗オーナーが理解できる平易な言葉を使ってください。
専門用語（ROAS, CVR, CTRなど）は使わず、「広告の費用対効果」「転換率」などの言葉に置き換えてください。

必ず以下のJSON形式のみで回答してください（マークダウンやコードブロック不要）:
{
  "strengths": ["強み1（1〜2文）", "強み2", "強み3"],
  "weaknesses": ["弱み1（1〜2文）", "弱み2"],
  "suggestions": [
    {"text": "具体的な改善提案1", "category": "line", "priority_rank": 1},
    {"text": "具体的な改善提案2", "category": "lp", "priority_rank": 2},
    {"text": "具体的な改善提案3", "category": "google", "priority_rank": 3}
  ],
  "priorities": ["今週中にやること1", "今月中にやること2", "来月の目標3"]
}

category は "lp" | "line" | "ad" | "coupon" | "google" | "general" のいずれか。
strengths は最大4つ、weaknesses は最大3つ、suggestions は最大5つ、priorities は最大4つ。`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `以下の店舗データを分析してください:\n\n${context}` },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}'
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Try to extract JSON from response
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : { strengths: [], weaknesses: [], suggestions: [], priorities: [] }
    }

    // Upsert analysis
    const { data: analysis, error } = await supabase
      .from('store_analyses')
      .upsert({
        store_id: storeId,
        analysis_date: analysisDate,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        suggestions: parsed.suggestions || [],
        priorities: parsed.priorities || [],
        ai_model: 'gpt-4o-mini',
        ai_generated_at: new Date().toISOString(),
        is_partner_edited: false,
      }, { onConflict: 'store_id,analysis_date' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ analysis })
  } catch (err: any) {
    console.error('Analysis generation failed:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/analysis/generate?storeId=xxx — get latest analysis
export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const { data: analysis } = await supabase
    .from('store_analyses')
    .select('*')
    .eq('store_id', storeId)
    .order('analysis_date', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ analysis })
}
