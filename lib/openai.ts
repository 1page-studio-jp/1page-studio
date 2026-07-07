import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

function extractJSON(text: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const raw = jsonMatch ? jsonMatch[0] : text
  return JSON.parse(raw.trim())
}

export interface StoreMetricsForAI {
  storeName: string
  period: string
  totalCost: number
  totalSales: number
  lpViews: number
  lineAdds: number
  conversionRate: number
  roas: number
}

export async function generateAiComment(metrics: StoreMetricsForAI): Promise<string> {
  const prompt = [
    'あなたは店舗マーケティングのプロです。以下のデータを分析し、店舗オーナーへの簡潔なコメントを日本語200字以内で生成してください。',
    '',
    '店舗名: ' + metrics.storeName,
    '期間: ' + metrics.period,
    '広告費: ¥' + metrics.totalCost.toLocaleString(),
    '売上: ¥' + metrics.totalSales.toLocaleString(),
    'LPビュー: ' + metrics.lpViews + '回',
    'LINE追加: ' + metrics.lineAdds + '件',
    '転換率: ' + metrics.conversionRate.toFixed(1) + '%',
    'ROAS: ' + metrics.roas.toFixed(1) + 'x',
    '',
    'コメントのみ返してください（JSON不要）。',
  ].join('\n')

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

export async function generateStoreAnalysis(metrics: StoreMetricsForAI): Promise<{
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  recommendations: string[]
  priority: string
}> {
  const prompt = [
    'マーケティング専門家として、以下の店舗データのSWOT分析と改善提案をJSON形式で返してください。',
    '',
    'データ: ' + JSON.stringify(metrics),
    '',
    '以下のJSON形式のみで返してください（説明不要）:',
    '{',
    '  "strengths": ["強み1", "強み2"],',
    '  "weaknesses": ["弱み1", "弱み2"],',
    '  "opportunities": ["機会1", "機会2"],',
    '  "recommendations": ["提案1", "提案2", "提案3"],',
    '  "priority": "最優先で取り組むべきことを1文で"',
    '}',
  ].join('\n')

  const result = await model.generateContent(prompt)
  return extractJSON(result.response.text())
}

export interface LpGenerationParams {
  storeName: string
  storeCategory: string
  area?: string
  appeal_angle: string
  existing_strengths?: string[]
  existing_services?: string[]
  phone?: string
  business_hours?: string
}

export interface GeneratedLpContent {
  catch_copy: string
  sub_copy: string
  service_description: string
  strengths: string[]
  appeal_points: string[]
  line_cta_text: string
  line_benefit: string
  seo_title: string
  seo_description: string
}

export async function generateLpContent(params: LpGenerationParams): Promise<GeneratedLpContent> {
  const strengthsNote = params.existing_strengths?.length
    ? '既存の強み情報: ' + params.existing_strengths.join('、')
    : ''
  const servicesNote = params.existing_services?.length
    ? 'サービス例: ' + params.existing_services.join('、')
    : ''

  const promptLines = [
    'あなたは日本のローカルビジネス向けLPコピーライターです。',
    '以下の訴求角度に基づいて、店舗のLPコンテンツをプロ品質で生成してください。',
    '',
    '【店舗情報】',
    '店舗名: ' + params.storeName,
    '業種: ' + params.storeCategory,
    'エリア: ' + (params.area || '未設定'),
  ]
  if (strengthsNote) promptLines.push(strengthsNote)
  if (servicesNote) promptLines.push(servicesNote)
  promptLines.push(
    '',
    '【今回の訴求角度（テスト施策）】',
    params.appeal_angle,
    '',
    '【要件】',
    '- キャッチコピーは訴求角度に直結させる（15文字以内）',
    '- サブコピーは感情に訴え、行動を促す（30文字以内）',
    '- サービス説明は信頼感と親近感を両立（80〜120文字）',
    '- 強み3点は数字・具体性を重視',
    '- アピールバッジ3点はキャッチーな短文（6文字以内）',
    '- LINEボタンテキストは行動喚起（10文字以内）',
    '- LINE特典は登録メリットを具体的に（20文字以内）',
    '- SEOタイトルはエリア+業種+訴求（30文字以内）',
    '- SEO説明文は検索意図に合わせた自然な文（80〜100文字）',
    '',
    '以下のJSON形式のみで返してください（説明不要）:',
    '{',
    '  "catch_copy": "キャッチコピー",',
    '  "sub_copy": "サブコピー",',
    '  "service_description": "サービス説明文",',
    '  "strengths": ["強み1", "強み2", "強み3"],',
    '  "appeal_points": ["バッジ1", "バッジ2", "バッジ3"],',
    '  "line_cta_text": "LINEボタンテキスト",',
    '  "line_benefit": "LINE登録特典テキスト",',
    '  "seo_title": "SEOタイトル",',
    '  "seo_description": "SEO説明文"',
    '}'
  )

  const prompt = promptLines.join('\n')
  const result = await model.generateContent(prompt)
  const parsed = extractJSON(result.response.text())
  return {
    catch_copy: parsed.catch_copy || '',
    sub_copy: parsed.sub_copy || '',
    service_description: parsed.service_description || '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
    appeal_points: Array.isArray(parsed.appeal_points) ? parsed.appeal_points.slice(0, 3) : [],
    line_cta_text: parsed.line_cta_text || 'LINEで予約する',
    line_benefit: parsed.line_benefit || '',
    seo_title: parsed.seo_title || '',
    seo_description: parsed.seo_description || '',
  }
}
