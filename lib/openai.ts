import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

function getModel() {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
}

function extractJSON(text: string): any {
  const match = text.match(/\{[\s\S]*\}/)
  const raw = match ? match[0] : text
  return JSON.parse(raw.trim())
}

// ============================================================
// AI Comment for Dashboard
// ============================================================
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
  const model = getModel()
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
  const model = getModel()
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

// ============================================================
// LP Content Generation — Pro Quality
// ============================================================
export interface LpGenerationParams {
  storeName: string
  storeCategory: string
  area?: string
  brief?: string         // フリーテキストの説明・訴求ポイント
  appeal_angle?: string  // 後方互換用
  existing_strengths?: string[]
  existing_services?: string[]
  phone?: string
  business_hours?: string
}

export interface LpService {
  name: string
  description: string
  price: string
  tag?: string
}

export interface LpTestimonial {
  name: string
  content: string
  rating: number
}

export interface LpFaq {
  q: string
  a: string
}

export interface GeneratedLpContent {
  catch_copy: string
  sub_copy: string
  service_description: string
  strengths: string[]
  appeal_points: string[]
  services: LpService[]
  testimonials: LpTestimonial[]
  faq: LpFaq[]
  line_cta_text: string
  line_benefit: string
  seo_title: string
  seo_description: string
}

export async function generateLpContent(params: LpGenerationParams): Promise<GeneratedLpContent> {
  const briefText = params.brief || params.appeal_angle || ''

  const strengthsLine = params.existing_strengths?.length
    ? '既存の強み: ' + params.existing_strengths.join('、') + '\n' : ''
  const servicesLine = params.existing_services?.length
    ? '既存のサービス: ' + params.existing_services.join('、') + '\n' : ''
  const phoneLine = params.phone ? `電話番号: ${params.phone}\n` : ''
  const hoursLine = params.business_hours ? `営業時間: ${params.business_hours}\n` : ''

  const prompt = `あなたは日本のローカルビジネス向け、集客特化型LPコピーライターです。
以下の店舗情報をもとに、新規集客に直結するプロ品質のLPコンテンツ一式を生成してください。

【店舗情報】
店舗名: ${params.storeName}
業種: ${params.storeCategory}
エリア: ${params.area || ''}
${phoneLine}${hoursLine}${strengthsLine}${servicesLine}
【オーナーからの説明・訴求ポイント】
${briefText || params.storeCategory + 'として地域のお客様に愛されるサービスを提供しています。'}

【生成ルール】
- キャッチコピー: お客様の欲求・課題に直撃する強力なコピー（20文字以内、数字や「○○専門」を積極的に使う）
- サブコピー: 店舗の特徴と信頼感を伝える補足文（40文字以内）
- サービス説明: 世界観と安心感を込めた店舗紹介文（120文字前後）
- 強み3点: 必ず具体的な数字を含める（「月○名が通う」「創業○年」「初回○%OFF」「○分以内」など）
- アピールバッジ: ヒーローセクションに並べる短文（各8文字以内、「初回割引」「完全個室」「駅近」など）
- メニュー: 3〜5件。価格は実際の業種に合わせてリアルな価格帯で（「¥○○〜」形式）。最初の1件に「人気No.1」タグ
- お客様の声: 3件。具体的なエピソード・体験談を含むリアルな声（各80〜120文字）。名前は「30代女性」「40代主婦」などの属性で
- FAQ: 5件。初めて来店するお客様が疑問に思うことを自然なQ&Aで
- LINEボタンテキスト: 行動喚起（10文字以内）
- LINE特典: 登録した人が得られる具体的な特典（20文字以内）
- SEOタイトル: エリア×業種×訴求の30文字以内
- SEO説明文: 検索意図に合わせた自然な文（80文字前後）

以下のJSON形式のみで返してください（前後の説明・マークダウン不要）:
{
  "catch_copy": "",
  "sub_copy": "",
  "service_description": "",
  "strengths": ["", "", ""],
  "appeal_points": ["", "", ""],
  "services": [
    {"name": "", "description": "", "price": "¥○○〜", "tag": "人気No.1"},
    {"name": "", "description": "", "price": "¥○○〜"},
    {"name": "", "description": "", "price": "¥○○〜"}
  ],
  "testimonials": [
    {"name": "30代女性", "content": "", "rating": 5},
    {"name": "40代主婦", "content": "", "rating": 5},
    {"name": "20代女性", "content": "", "rating": 5}
  ],
  "faq": [
    {"q": "", "a": ""},
    {"q": "", "a": ""},
    {"q": "", "a": ""},
    {"q": "", "a": ""},
    {"q": "", "a": ""}
  ],
  "line_cta_text": "",
  "line_benefit": "",
  "seo_title": "",
  "seo_description": ""
}`

  try {
    const model = getModel()
    const result = await model.generateContent(prompt)
    const parsed = extractJSON(result.response.text())

    return {
      catch_copy: parsed.catch_copy || '',
      sub_copy: parsed.sub_copy || '',
      service_description: parsed.service_description || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      appeal_points: Array.isArray(parsed.appeal_points) ? parsed.appeal_points.slice(0, 3) : [],
      services: Array.isArray(parsed.services) ? parsed.services.slice(0, 5) : [],
      testimonials: Array.isArray(parsed.testimonials) ? parsed.testimonials.slice(0, 3) : [],
      faq: Array.isArray(parsed.faq) ? parsed.faq.slice(0, 5) : [],
      line_cta_text: parsed.line_cta_text || 'LINEで予約する',
      line_benefit: parsed.line_benefit || '',
      seo_title: parsed.seo_title || '',
      seo_description: parsed.seo_description || '',
    }
  } catch (error) {
    console.error('Gemini LP generation failed, using fallback:', error)
    return generateFallbackContent(params, briefText)
  }
}

function generateFallbackContent(params: LpGenerationParams, brief: string): GeneratedLpContent {
  const { storeName, storeCategory, area } = params
  const a = area || ''
  const cat = storeCategory || 'サービス'

  return {
    catch_copy: `${a ? a + 'で' : ''}選ばれる${cat}`,
    sub_copy: `${storeName}が選ばれる理由があります。まずはお気軽にご相談ください。`,
    service_description: `${storeName}は${a ? a + 'の' : ''}${cat}です。${brief ? brief.substring(0, 80) : 'お客様一人ひとりに丁寧な対応をお約束します。'}`,
    strengths: [
      `地域のお客様に選ばれ続ける${cat}。リピート率85%以上`,
      `経験豊富なスタッフが担当。初めての方も安心してご利用いただけます`,
      `LINE登録で初回限定特典プレゼント。予約もLINEで完結`,
    ],
    appeal_points: ['高品質', '安心価格', '予約簡単'],
    services: [
      { name: 'スタンダードコース', description: '最も人気のベーシックプランです', price: 'お問合せ', tag: '人気No.1' },
      { name: 'プレミアムコース', description: 'こだわりの上質なサービスプランです', price: 'お問合せ' },
      { name: '初回体験コース', description: '初めての方向けのお試しプランです', price: 'お問合せ', tag: '初回限定' },
    ],
    testimonials: [
      { name: '30代女性', content: `${storeName}に来て本当によかったです。スタッフの方がとても親切で、悩みを丁寧に聞いてくれました。また絶対来ます！`, rating: 5 },
      { name: '40代男性', content: `仕事帰りに利用しています。予約が取りやすく、いつも満足のいくサービスを受けられます。友人にも勧めています。`, rating: 5 },
      { name: '20代女性', content: `友達に教えてもらって来ましたが、想像以上でした。価格もリーズナブルで、クオリティも高い。定期的に通っています。`, rating: 5 },
    ],
    faq: [
      { q: '初めてでも大丈夫ですか？', a: 'はい、初めての方も大歓迎です。スタッフが丁寧にご説明しますのでお気軽にお越しください。' },
      { q: '予約は必要ですか？', a: '予約優先制となっています。当日の空き状況はLINEまたはお電話でご確認いただけます。' },
      { q: '支払い方法は何が使えますか？', a: '現金・クレジットカード・PayPayなど主要な決済方法に対応しています。' },
      { q: 'キャンセルはどうすればいいですか？', a: 'ご予約の前日までにご連絡ください。当日キャンセルはご遠慮いただいております。' },
      { q: '駐車場はありますか？', a: '近隣にコインパーキングがございます。詳細はご来店前にお問い合わせください。' },
    ],
    line_cta_text: 'LINEで予約する',
    line_benefit: 'LINE登録で初回特典プレゼント',
    seo_title: `${storeName} | ${a ? a + 'の' : ''}${cat}`,
    seo_description: `${a ? a + 'の' : ''}${cat}「${storeName}」。${brief ? brief.substring(0, 50) + '。' : ''}お気軽にご相談ください。`,
  }
}
