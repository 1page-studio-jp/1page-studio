import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
  todos: string[]
  suggestions: Array<{ type: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }>
}> {
  const prompt = `
あなたは店舗マーケティングの専門アドバイザーです。
以下の店舗データを分析し、店舗オーナーへの分かりやすいアドバイスを生成してください。

【店舗情報】
店舗名: ${metrics.storeName}
業種: ${metrics.industry}
分析期間: ${metrics.period}

【集客データ】
広告費: ¥${metrics.cost.toLocaleString()}
売上: ¥${metrics.sales.toLocaleString()}
ROAS: ${metrics.roas}倍
CPA: ¥${metrics.cpa.toLocaleString()}
LPアクセス: ${metrics.lpViews}件
LINE登録: ${metrics.lineAdds}件（登録率${metrics.lineAddRate.toFixed(1)}%）
問い合わせ: ${metrics.inquiries}件
予約: ${metrics.reservations}件
クーポン利用: ${metrics.couponUses}件
主要集客媒体: ${metrics.topPlatform}

以下のJSON形式で回答してください：
{
  "comment": "店舗オーナー向けの今日の一言コメント（2〜3文、具体的で前向きな表現）",
  "todos": ["今日やること1", "今日やること2", "今日やること3"],
  "suggestions": [
    {
      "type": "lp|google_ads|line|google_map|meta_ads|coupon|general",
      "title": "改善提案のタイトル",
      "description": "具体的な改善内容（1〜2文）",
      "priority": "high|medium|low"
    }
  ]
}

注意事項:
- 専門用語は使わず、店舗オーナーが理解できる平易な日本語で書く
- 具体的な数字を使って説明する
- 改善提案は2〜4件にまとめる
- 今日やることは3件にする
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const result = JSON.parse(response.choices[0].message.content ?? '{}')
  return {
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  })

  const result = JSON.parse(response.choices[0].message.content ?? '{}')
  return {
    catchCopy: result.catchCopy ?? '',
    serviceDescription: result.serviceDescription ?? '',
    strengths: result.strengths ?? [],
    faq: result.faq ?? [],
  }
}

export default openai
