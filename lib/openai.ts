import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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
  headline: string
  comment: string
  todos: string[]
  suggestions: Array<{ type: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }>
}> {
  const prompt = `
あなたは日本の地域ビジネス（美容室・整体院・エステ・サロンなど）専門のデジタルマーケティングアドバイザーです。
以下のデータを分析し、店舗オーナーが「今すぐ行動できる」具体的なアドバイスを出力してください。

【業界ベンチマーク（参考）】
- ROAS 2.0以上 = 優良 / 1.0〜2.0 = 要改善 / 1.0未満 = 赤字警戒
- LP→LINE登録率 5%以上 = 優良 / 3〜5% = 普通 / 3%未満 = LP改善が急務
- CPA 3,000円以下 = 優良 / 5,000円以上 = 広告設定を見直す

【店舗情報】
店舗名: ${metrics.storeName}
業種: ${metrics.industry}
分析期間: ${metrics.period}

【集客データ】
広告費: ¥${metrics.cost.toLocaleString()}
売上（広告経由）: ¥${metrics.sales.toLocaleString()}
ROAS: ${metrics.roas}倍
CPA（1件あたり広告費）: ¥${metrics.cpa.toLocaleString()}
LPアクセス: ${metrics.lpViews}件
LINE登録: ${metrics.lineAdds}件（登録率${metrics.lineAddRate.toFixed(1)}%）
問い合わせ: ${metrics.inquiries}件
予約: ${metrics.reservations}件
クーポン利用: ${metrics.couponUses}件
主要集客媒体: ${metrics.topPlatform}

以下のJSON形式で回答してください：
{
  "headline": "最重要メッセージ（20文字以内、具体的な数字か行動を含める）例：LINE登録率が業界平均の半分です",
  "comment": "現状の率直な評価。何が上手くいっていて、何が最大のボトルネックかを具体的な数字で説明（2〜3文）",
  "todos": [
    "【最優先】今週中に実行すること（何を・どうするか・期待できる効果を1文で）",
    "【次に重要】2番目のアクション",
    "【継続改善】長期的に続けるべきこと"
  ],
  "suggestions": [
    {
      "type": "lp|google_ads|line|google_map|meta_ads|coupon|general",
      "title": "改善提案タイトル",
      "description": "具体的な改善内容と期待できる効果（1〜2文）",
      "priority": "high|medium|low"
    }
  ]
}

注意事項:
- 専門用語は避け、オーナーが理解できる平易な日本語で書く
- 必ずデータから算出した具体的な数字を使う
- ベンチマークと比較して現状を評価する
- 改善提案は2〜3件
- todosは優先順位をつけて、最も効果的なものを1番に
`

  const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const geminiResult = await geminiModel.generateContent(prompt)
  const geminiText = geminiResult.response.text().trim()
  const jsonMatch1 = geminiText.match(/\{[\s\S]*\}/)
  const result = JSON.parse(jsonMatch1 ? jsonMatch1[0] : '{}')
  return {
    headline: result.headline ?? '',
    comment: result.comment ?? '',
    todos: result.todos ?? [],
    suggestions: result.suggestions ?? [],
  }
}

/** LP文章をAIで生成 */
export async function generateLpContent(input: {
  storeName: string
  industry: string
  features: string
  targetCustomer: string
}): Promise<{
  catchCopy: string
  serviceDescription: string
  strengths: string[]
  faq: Array<{ question: string; answer: string }>
}> {
  const prompt = `
あなたは店舗集客のLPライターです。
以下の情報をもとに、LP用のコンテンツを生成してください。

店舗名: ${input.storeName}
業種: ${input.industry}
特徴・強み: ${input.features}
ターゲット顧客: ${input.targetCustomer}

以下のJSON形式で回答してください：
{
  "catchCopy": "キャッチコピー（20文字以内）",
  "serviceDescription": "サービス説明文（100文字程度）",
  "strengths": ["強み1", "強み2", "強み3"],
  "faq": [
    {"question": "よくある質問1", "answer": "回答1"},
    {"question": "よくある質問2", "answer": "回答2"},
    {"question": "よくある質問3", "answer": "回答3"}
  ]
}
`

  const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const geminiResult = await geminiModel.generateContent(prompt)
  const geminiText = geminiResult.response.text().trim()
  const jsonMatch2 = geminiText.match(/\{[\s\S]*\}/)
  const result = JSON.parse(jsonMatch2 ? jsonMatch2[0] : '{}')
  return {
    catchCopy: result.catchCopy ?? '',
    serviceDescription: result.serviceDescription ?? '',
    strengths: result.strengths ?? [],
    faq: result.faq ?? [],
  }
}

export default genAI
