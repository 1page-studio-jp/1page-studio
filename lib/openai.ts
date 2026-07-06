import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export interface StoreMetricsForAI {
  storeName: string
  industry: string
  period: string
  cost: number
  sales: number
  roas: number
  cpa: number
  lpViews: number
  lineAdds: number
  lineAddRate: number
  inquiries: number
  reservations: number
  couponUses: number
  topPlatform: string
}

/** AIコメント・改善提案を生成 */
export async function generateAiComment(metrics: StoreMetricsForAI): Promise<{
  comment: string
  suggestions: Array<{ category: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }>
}> {
  const prompt = `あなたは店舗集客の専門コンサルタントです。以下のデータを分析し、オーナーへのコメントと改善提案を生成してください。

店舗名: ${metrics.storeName}
業種: ${metrics.industry}
期間: ${metrics.period}
広告費: ¥${metrics.cost.toLocaleString()}
売上: ¥${metrics.sales.toLocaleString()}
ROAS: ${metrics.roas.toFixed(2)}倍
CPA: ¥${metrics.cpa.toLocaleString()}
LPアクセス: ${metrics.lpViews}
LINE登録: ${metrics.lineAdds}（登録率 ${metrics.lineAddRate.toFixed(1)}%）
問い合わせ: ${metrics.inquiries}
予約: ${metrics.reservations}
クーポン利用: ${metrics.couponUses}
主要チャネル: ${metrics.topPlatform}

以下のJSON形式で回答してください（日本語で）:
{
  "comment": "オーナーへの総合コメント（2〜3文）",
  "suggestions": [
    {"category": "LP|広告|LINE|クーポン|その他", "title": "提案タイトル", "description": "具体的な改善内容", "priority": "high|medium|low"}
  ]
}
JSONのみ返してください。`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}

/** AI分析レポートを生成（強み・弱み・改善提案・優先順位） */
export async function generateStoreAnalysis(metrics: StoreMetricsForAI): Promise<{
  strengths: string[]
  weaknesses: string[]
  suggestions: Array<{ category: string; content: string }>
  priorities: string[]
}> {
  const prompt = `店舗データを分析し、強み・弱み・改善提案・優先アクションをJSON形式で返してください。

店舗名: ${metrics.storeName} / 業種: ${metrics.industry}
広告費: ¥${metrics.cost.toLocaleString()} / 売上: ¥${metrics.sales.toLocaleString()} / ROAS: ${metrics.roas.toFixed(2)}倍
LPアクセス: ${metrics.lpViews} / LINE登録: ${metrics.lineAdds}（${metrics.lineAddRate.toFixed(1)}%）
問い合わせ: ${metrics.inquiries} / 予約: ${metrics.reservations}

{
  "strengths": ["強み1（1文）", "強み2"],
  "weaknesses": ["改善点1（1文）", "改善点2"],
  "suggestions": [
    {"category": "LP|広告|LINE|クーポン", "content": "具体的提案（1文）"}
  ],
  "priorities": ["優先アクション1（具体的に）", "優先アクション2", "優先アクション3"]
}
JSONのみ返してください。`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}

/** LP文章を生成 */
export async function generateLpContent(params: {
  store_name: string
  industry: string
  target: string
  strengths: string
}): Promise<{ catch_copy: string; service_description: string; strengths: string[] }> {
  const prompt = `以下の店舗情報をもとに、LPのキャッチコピー・サービス説明・選ばれる理由をJSON形式で生成してください。

店舗名: ${params.store_name}
業種: ${params.industry}
ターゲット: ${params.target}
強み: ${params.strengths}

{
  "catch_copy": "キャッチコピー（20文字以内）",
  "service_description": "サービス説明（80〜120文字）",
  "strengths": ["選ばれる理由1（15文字以内）", "選ばれる理由2", "選ばれる理由3"]
}
JSONのみ返してください。`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}
