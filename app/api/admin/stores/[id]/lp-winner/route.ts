import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // LP一覧と分析データを取得
    const { data: lps } = await supabase
      .from('lp_pages')
      .select('id, appeal_angle, catch_copy, status, created_at')
      .eq('store_id', params.id)
      .order('created_at', { ascending: false })

    if (!lps || lps.length === 0) {
      return NextResponse.json({ error: 'LPがありません' }, { status: 404 })
    }

    // 各LPのアナリティクスを取得（date-rangeベース）
    const today = new Date().toISOString().split('T')[0]
    const lpDataList = await Promise.all(lps.map(async (lp, idx) => {
      const from = lp.created_at.split('T')[0]
      const to = lps[idx - 1]?.created_at.split('T')[0] || today

      const { data: ads } = await supabase
        .from('ad_daily_reports')
        .select('lp_views, line_adds, cost, sales')
        .eq('store_id', params.id)
        .gte('date', from)
        .lte('date', to)

      const views = ads?.reduce((s, r) => s + (r.lp_views || 0), 0) || 0
      const adds = ads?.reduce((s, r) => s + (r.line_adds || 0), 0) || 0
      const cost = ads?.reduce((s, r) => s + (r.cost || 0), 0) || 0

      return {
        appeal_angle: lp.appeal_angle || '不明',
        catch_copy: lp.catch_copy || '',
        status: lp.status,
        lp_views: views,
        line_adds: adds,
        cost,
        cvr: views > 0 ? ((adds / views) * 100).toFixed(1) : '0.0',
        period: from + ' 〜 ' + to,
      }
    }))

    // Geminiで分析
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = [
      'あなたはマーケティング分析の専門家です。',
      '以下のLPパフォーマンスデータを分析して、JSON形式で回答してください。',
      '',
      'LPデータ:',
      JSON.stringify(lpDataList, null, 2),
      '',
      '以下のJSON形式で回答:',
      '{',
      '  "winner_angle": "最もCVRが高い訴求角度",',
      '  "winner_reason": "勝者の理由（2〜3文）",',
      '  "next_angle": "次にテストすべき訴求角度（具体的に）",',
      '  "next_reason": "次の訴求角度の理由（2〜3文）",',
      '  "insights": ["インサイト1", "インサイト2", "インサイト3"]',
      '}',
    ].join('\n')

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { winner_angle: '分析不能', winner_reason: text, next_angle: '', next_reason: '', insights: [] }

    return NextResponse.json({ analysis, lp_data: lpDataList })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
