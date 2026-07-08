import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

function rulesBasedAnalysis(lpDataList: any[]) {
  const sorted = [...lpDataList].sort((a, b) => parseFloat(b.cvr) - parseFloat(a.cvr))
  const winner = sorted[0]
  const loser = sorted[sorted.length - 1]
  const angles = ['価格訴求（コスパ強調）', 'クオリティ訴求（品質・実績）', 'スピード訴求（即日対応）', '安心感訴求（アフターケア）', '体験訴求（ビフォーアフター）']
  const usedAngles = lpDataList.map(lp => lp.appeal_angle).filter(Boolean)
  const nextAngle = angles.find(a => !usedAngles.some(u => u.includes(a.split('（')[0]))) || '新しい訴求軸でテスト'
  return {
    winner_angle: winner.appeal_angle || 'デフォルトLP',
    winner_reason: `CVR ${winner.cvr}%が最も高く、${winner.clicks}クリック中${winner.conversions}件転換`,
    next_angle: nextAngle,
    next_reason: 'まだ試していない訴求軸でA/Bテストを実施し、さらなる改善を目指す',
    insights: [
      `最高CVR: ${winner.cvr}% (${winner.appeal_angle || 'LP1'})`,
      `平均CTR: ${(lpDataList.reduce((s, l) => s + parseFloat(l.ctr), 0) / lpDataList.length).toFixed(2)}%`,
      lpDataList.length > 1 ? `CVR差: ${(parseFloat(winner.cvr) - parseFloat(loser.cvr)).toFixed(2)}%ポイント` : 'さらにLPを追加してA/Bテストを'
    ],
    method: 'rules'
  }
}

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

    // まずGeminiで試みる、失敗時はルールベースにフォールバック
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
      const prompt = `LP比較分析。JSON形式のみで回答:
${lpDataList.map((lp, i) => `LP${i + 1}: 訴求=${lp.appeal_angle || 'N/A'} CVR=${lp.cvr}% CTR=${lp.ctr}%`).join(' / ')}
{"winner_angle":"...","winner_reason":"100字以内","next_angle":"...","next_reason":"100字以内","insights":["...","...","..."]}`

      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0])
        return NextResponse.json({ analysis: { ...analysis, method: 'ai' }, lp_data: lpDataList })
      }
    } catch (geminiErr: any) {
      console.warn('Gemini unavailable, using rules-based analysis:', geminiErr.message?.slice(0, 100))
    }

    // ルールベースフォールバック
    const analysis = rulesBasedAnalysis(lpDataList)
    return NextResponse.json({ analysis, lp_data: lpDataList })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
