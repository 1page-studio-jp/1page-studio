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
  const connectedPlatforms = (connections || []).map((c: any) => c.platform).join(', ') || 'ãªã'
  const activeCoupons = (coupons || []).filter((c: any) => c.display_status === 'visible').length
  const totalCouponUses = (coupons || []).reduce((sum: number, c: any) => sum + (c.usage_count || 0), 0)

  return `
åºèå: ${store?.store_name || 'ä¸æ'}
æ¥­ç¨®: ${store?.industry || 'ä¸æ'}

ãéå»30æ¥ã®ææ¨ã
- åºåã¯ãªãã¯: ${stats.clicks}
- LPé²è¦§: ${stats.lp_views}
- LINEç»é²: ${stats.line_adds}ï¼LPâLINEè»¢æç: ${lpToLine}%ï¼
- åãåãã: ${stats.inquiries_count}ä»¶
- äºç´: ${stats.reservations}ä»¶
- ã¯ã¼ãã³ä½¿ç¨: ${stats.coupon_uses}ä»¶
- å£²ä¸: Â¥${stats.sales.toLocaleString()}
- åºåè²»: Â¥${stats.cost.toLocaleString()}ï¼è²»ç¨å¯¾å¹æ: ${roas}ï¼

ãåãåããç®¡çã
- ç·åãåãã: ${inquiries?.length || 0}ä»¶ï¼æªå¯¾å¿: ${uninquiries}ä»¶ï¼

ãã¯ã¼ãã³ç¶æ³ã
- å¬éä¸­ã¯ã¼ãã³: ${activeCoupons}ä»¶
- ç´¯è¨ä½¿ç¨æ°: ${totalCouponUses}ä»¶

ãLPç¶æ³ã
- ã­ã£ããã³ãã¼: ${lp?.catch_copy || 'æªè¨­å®'}
- LINEé£æº: ${lp?.line_button_url ? 'è¨­å®æ¸ã¿' : 'æªè¨­å®'}
- LPç¶æ: ${lp?.status || 'æªå¬é'}

ãé£æºãµã¼ãã¹ã
${connectedPlatforms}

ãæè¿ã®æ¹åå±¥æ­´ï¼30æ¥ä»¥åï¼ã
${(milestones || []).map((m: any) => `- ${m.happened_at}: ${m.title}${m.metric_value ? ` (${m.metric_label}: ${m.metric_value})` : ''}`).join('\n') || 'ãªã'}
`.trim()
}

// ----------------------------------------------------------------
// POST /api/analysis/generate
// ----------------------------------------------------------------
export async function POST(request: NextRequest) {
  const supabase = createClient()

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

    const systemPrompt = `ããªãã¯é£²é£ã»ç¾å®¹ã»å¥åº·ç³»ã®ä¸­å°åºèåããã¼ã±ãã£ã³ã°ã¢ããã¤ã¶ã¼ã§ãã
æä¾ãããåºèãã¼ã¿ãåæããä»¥ä¸ã®JSONå½¢å¼ã§åç­ãã¦ãã ããã
åç­ã¯å¿ãæ¥æ¬èªã§ãåºèãªã¼ãã¼ãçè§£ã§ããå¹³æãªè¨èãä½¿ã£ã¦ãã ããã
å°éç¨èªï¼ROAS, CVR, CTRãªã©ï¼ã¯ä½¿ããããåºåã®è²»ç¨å¯¾å¹æããè»¢æçããªã©ã®è¨èã«ç½®ãæãã¦ãã ããã

å¿ãä»¥ä¸ã®JSONå½¢å¼ã®ã¿ã§åç­ãã¦ãã ããï¼ãã¼ã¯ãã¦ã³ãã³ã¼ããã­ãã¯ä¸è¦ï¼:
{
  "strengths": ["å¼·ã¿1ï¼1ã2æï¼", "å¼·ã¿2", "å¼·ã¿3"],
  "weaknesses": ["å¼±ã¿1ï¼1ã2æï¼", "å¼±ã¿2"],
  "suggestions": [
    {"text": "å·ä½çãªæ¹åææ¡1", "category": "line", "priority_rank": 1},
    {"text": "å·ä½çãªæ¹åææ¡2", "category": "lp", "priority_rank": 2},
    {"text": "å·ä½çãªæ¹åææ¡3", "category": "google", "priority_rank": 3}
  ],
  "priorities": ["ä»é±ä¸­ã«ãããã¨1", "ä»æä¸­ã«ãããã¨2", "æ¥æã®ç®æ¨3"]
}

category ã¯ "lp" | "line" | "ad" | "coupon" | "google" | "general" ã®ããããã
strengths ã¯æå¤§4ã¤ãweaknesses ã¯æå¤§3ã¤ãsuggestions ã¯æå¤§5ã¤ãpriorities ã¯æå¤§4ã¤ã`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `ä»¥ä¸ã®åºèãã¼ã¿ãåæãã¦ãã ãã:\n\n${context}` },
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

// GET /api/analysis/generate?storeId=xxx â get latest analysis
export async function GET(request: NextRequest) {
  const supabase = createClient()

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
