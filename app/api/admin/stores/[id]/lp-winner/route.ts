import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(n: string) { return cookieStore.get(n)?.value }, set() {}, remove() {} } }
  )

  try {
    const { data: lps } = await supabase
      .from('lp_pages')
      .select('id, appeal_angle, catch_copy, status, created_at')
      .eq('store_id', params.id)
      .order('created_at', { ascending: false })

    if (!lps || lps.length === 0) {
      return NextResponse.json({ error: 'LPがありません' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const lpDataList = await Promise.all(lps.map(async (lp) => {
      const { data: reports } = await supabase
        .from('ad_daily_reports')
        .select('impressions, clicks, conversions, cost')
        .eq('lp_id', lp.id)
        .gte('date', thirtyDaysAgo)
        .lte('date', today)

      const totals = (reports || []).reduce((acc, r) => ({
        impressions: acc.impressions + (r.impressions || 0),
        clicks: acc.clicks + (r.clicks || 0),
        conversions: acc.conversions + (r.conversions || 0),
        cost: acc.cost + (r.cost || 0)
      }), { impressions: 0, clicks: 0, conversions: 0, cost: 0 })

      const cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks * 100).toFixed(2) : '0'
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : '0'
      const cpa = totals.conversions > 0 ? (totals.cost / totals.conversions).toFixed(0) : 'N/A'

      return { id: lp.id, appeal_angle: lp.appeal_angle, catch_copy: lp.catch_copy, status: lp.status, created_at: lp.created_at, ...totals, cvr, ctr, cpa }
    }))

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `以下のLP（ランディングページ）のパフォーマンスデータを分析し、最も効果的なLPを特定してください。

LPデータ:
${lpDataList.map((lp, i) => `LP${i + 1}:
- 訴求角度: ${lp.appeal_angle || '未設定'}
- キャッチコピー: ${lp.catch_copy || '未設定'}
- インプレッション: ${lp.impressions} | CVR: ${lp.cvr}% | CTR: ${lp.ctr}% | コンバージョン: ${lp.conversions} | CPA: ${lp.cpa}`).join('\n\n')}

以下のJSON形式のみで回答（説明不要）:
{"winner_angle":"勝者の訴求角度","winner_reason":"理由100字以内","next_angle":"次に試す訴求角度","next_reason":"理由100字以内","insights":["インサイト1","インサイト2","インサイト3"]}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    let analysis = null
    if (jsonMatch) {
      try { analysis = JSON.parse(jsonMatch[0]) } catch { analysis = null }
    }

    return NextResponse.json({ analysis, lp_data: lpDataList })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
