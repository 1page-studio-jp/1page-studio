// ================================================================
// lp-templates.ts
// 業種別LPテンプレート定義
//
// 新しい業種を追加する場合:
//   1. INDUSTRIES 配列に追加
//   2. LP_TEMPLATES に同じ id のキーで追加
//   3. 終わり — コードの変更はこの1ファイルだけ
// ================================================================

export interface Industry {
  id: string
  label: string         // 表示名
  emoji: string         // アイコン代わりの絵文字
  description: string   // 管理画面での説明文
  color: string         // Tailwind bg class
  textColor: string     // Tailwind text class
}

export interface LPTemplate {
  industryId: string

  // 基本情報のデフォルト値
  catch_copy: string
  sub_copy: string
  appeal_points: string[]    // 選ばれる3つの理由
  services: ServiceItem[]
  features: string[]         // お店の特徴
  cta_text: string           // ボタンテキスト
  line_cta_text: string      // LINE登録ボタンのテキスト
  line_benefit: string       // LINE登録の特典説明

  // スタイル提案
  suggested_primary_color: string   // hex
  suggested_accent_color: string    // hex
  suggested_image_keywords: string[] // 写真検索のヒント

  // SEO / 広告向け
  target_keywords: string[]   // 想定検索キーワード
  ad_headline_template: string // 広告見出しの例
}

export interface ServiceItem {
  name: string
  description: string
  price?: string
  tag?: string  // 例: "人気No.1", "初回限定"
}

// ================================================================
// 業種リスト（表示用）
// ================================================================
export const INDUSTRIES: Industry[] = [
  {
    id: 'salon',
    label: '美容室・サロン',
    emoji: '💇',
    description: 'ヘアサロン、ネイルサロン、まつ毛サロンなど',
    color: 'bg-pink-100',
    textColor: 'text-pink-700',
  },
  {
    id: 'restaurant',
    label: '飲食店',
    emoji: '🍽️',
    description: 'レストラン、カフェ、居酒屋、ラーメン店など',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  {
    id: 'osteopathy',
    label: '整体院・治療院',
    emoji: '🦴',
    description: '整骨院、整体、鍼灸院、マッサージなど',
    color: 'bg-teal-100',
    textColor: 'text-teal-700',
  },
  {
    id: 'gym',
    label: 'ジム・フィットネス',
    emoji: '💪',
    description: 'パーソナルジム、ヨガ、ピラティス、スポーツジムなど',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  // ── 追加業種はここに ──
  // {
  //   id: 'dental',
  //   label: '歯科・クリニック',
  //   emoji: '🦷',
  //   description: '歯科医院、クリニックなど',
  //   color: 'bg-cyan-100',
  //   textColor: 'text-cyan-700',
  // },
]

export function getIndustry(id: string): Industry | undefined {
  return INDUSTRIES.find(i => i.id === id)
}

// ================================================================
// テンプレート本体
// ================================================================
export const LP_TEMPLATES: Record<string, LPTemplate> = {

  // ──────────────────────────────────────────
  // 美容室・サロン
  // ──────────────────────────────────────────
  salon: {
    industryId: 'salon',
    catch_copy: '縮毛矯正専門サロン｜あなたの髪の悩みを根本から解決',
    sub_copy: '渋谷・新宿エリアで月200名が通うサロン。一人ひとりに合わせた施術で、翌日もまとまる髪へ。',
    appeal_points: [
      '薬剤を髪質に合わせて調合。ダメージを最小限に抑えた施術',
      'LINE登録で初回20%OFFクーポンをプレゼント',
      '完全個室のプライベート空間。アレルギー・敏感肌の方も安心',
    ],
    services: [
      { name: '縮毛矯正（ショート）', description: 'くせ毛・うねりをしっかり伸ばします', price: '¥14,000〜', tag: '人気No.1' },
      { name: '縮毛矯正（ロング）', description: '毛先まで均一にまとまるストレートへ', price: '¥18,000〜' },
      { name: 'カット+カラー', description: '似合わせカット×透明感カラー', price: '¥12,000〜', tag: '初回限定' },
      { name: 'トリートメント', description: 'ダメージを補修し、ツヤとまとまりを', price: '¥4,000〜' },
    ],
    features: [
      '駅徒歩3分・完全予約制',
      'カウンセリング無料（初回30分）',
      'キッズスペースあり',
    ],
    cta_text: '今すぐ無料カウンセリングを予約する',
    line_cta_text: 'LINEで相談・予約する',
    line_benefit: 'LINE登録で初回20%OFFクーポンをプレゼント',
    suggested_primary_color: '#ec4899',
    suggested_accent_color: '#fdf2f8',
    suggested_image_keywords: ['美容室 施術', 'ヘアサロン 内装', '縮毛矯正 ビフォーアフター'],
    target_keywords: ['縮毛矯正 渋谷', 'ヘアサロン 渋谷 おすすめ', '美容室 渋谷 縮毛'],
    ad_headline_template: '【渋谷】縮毛矯正専門サロン｜初回20%OFF',
  },

  // ──────────────────────────────────────────
  // 飲食店
  // ──────────────────────────────────────────
  restaurant: {
    industryId: 'restaurant',
    catch_copy: '地元で愛される本格焼肉｜一頭買いの新鮮和牛をリーズナブルに',
    sub_copy: '仕入れから焼き方まで妥協しない。月300組が訪れる隠れ家焼肉店です。',
    appeal_points: [
      '産地直送の黒毛和牛を一頭買い。鮮度と品質が違います',
      'LINE登録でドリンク1杯無料サービス',
      '個室完備で誕生日・記念日のご利用に最適',
    ],
    services: [
      { name: 'ランチコース', description: 'サラダ・スープ・デザート付き', price: '¥1,800〜', tag: '平日限定' },
      { name: 'ディナーコース A', description: '10品のこだわりコース', price: '¥4,500〜', tag: '人気No.1' },
      { name: 'ディナーコース B（プレミアム）', description: '希少部位含む贅沢14品', price: '¥7,800〜' },
      { name: '食べ飲み放題', description: '100分制、全60種以上', price: '¥3,980〜', tag: '大人数OK' },
    ],
    features: [
      '駐車場完備（10台）',
      '団体・宴会予約歓迎（最大40名）',
      'テイクアウト・デリバリー対応',
    ],
    cta_text: '今すぐ席を予約する',
    line_cta_text: 'LINEで予約・問い合わせ',
    line_benefit: 'LINE登録でドリンク1杯無料クーポンをお届け',
    suggested_primary_color: '#dc2626',
    suggested_accent_color: '#fef2f2',
    suggested_image_keywords: ['焼肉 肉 美味しそう', '焼肉店 内装 個室', '和牛 霜降り'],
    target_keywords: ['焼肉 渋谷 個室', '焼肉 渋谷 ランチ', '焼肉 渋谷 安い 旨い'],
    ad_headline_template: '【渋谷】本格焼肉｜LINE登録でドリンク無料',
  },

  // ──────────────────────────────────────────
  // 整体院・治療院
  // ──────────────────────────────────────────
  osteopathy: {
    industryId: 'osteopathy',
    catch_copy: '腰痛・肩こりを根本から改善｜通い続けない身体を作ります',
    sub_copy: '理学療法士監修の施術で、症状ではなく「原因」にアプローチ。再発しない体づくりをサポートします。',
    appeal_points: [
      '国家資格保有の施術家が担当。根本原因を丁寧に分析',
      '初回限定2,000円オフ。LINEで予約完結',
      '完全個室・完全予約制。待ち時間ゼロ',
    ],
    services: [
      { name: '初回カウンセリング+施術', description: '60分かけて身体の状態を詳しく確認', price: '¥6,000（初回特価）', tag: '初回限定' },
      { name: '腰痛・坐骨神経痛コース', description: '原因から改善する全身調整', price: '¥7,500/回' },
      { name: '肩こり・首こりコース', description: '姿勢矯正+深部ほぐし', price: '¥6,000/回', tag: '人気No.1' },
      { name: '産後骨盤矯正', description: '出産後の骨盤をやさしく整えます', price: '¥8,000/回' },
    ],
    features: [
      '駅徒歩2分・夜20時まで営業',
      'お子様連れOK（キッズスペースあり）',
      '回数券あり（5回購入で1回無料）',
    ],
    cta_text: '初回無料カウンセリングを予約する',
    line_cta_text: 'LINEで予約・相談する',
    line_benefit: 'LINE登録で初回施術2,000円OFFクーポンをプレゼント',
    suggested_primary_color: '#0d9488',
    suggested_accent_color: '#f0fdfa',
    suggested_image_keywords: ['整体 施術', '整骨院 内装', '腰痛 改善 イメージ'],
    target_keywords: ['整体 渋谷 腰痛', '整骨院 渋谷 おすすめ', '肩こり 整体 渋谷'],
    ad_headline_template: '【渋谷】腰痛・肩こり専門整体｜初回2,000円OFF',
  },

  // ──────────────────────────────────────────
  // ジム・フィットネス
  // ──────────────────────────────────────────
  gym: {
    industryId: 'gym',
    catch_copy: '3ヶ月で理想の体型へ｜マンツーマンパーソナルジム',
    sub_copy: '食事管理+トレーニングの完全サポートで、ダイエット・筋トレの成果を最速で実現します。',
    appeal_points: [
      '担当トレーナーが毎回同じ。一人ひとりに最適なメニューを設計',
      '体験トレーニング無料。LINE登録で予約できます',
      '完全個室・24時間型。仕事が忙しい方でも続けられる',
    ],
    services: [
      { name: '体験トレーニング', description: '60分のマンツーマン体験+カウンセリング', price: '無料', tag: '初回限定' },
      { name: '3ヶ月集中コース', description: '週2回×12セッション+食事管理サポート', price: '¥198,000', tag: '人気No.1' },
      { name: '月8回コース', description: '月2回×継続型。自分のペースで通える', price: '¥52,000/月' },
      { name: 'オンライントレーニング', description: '自宅でトレーナーと一緒にトレーニング', price: '¥28,000/月' },
    ],
    features: [
      '渋谷駅徒歩5分・完全個室10室',
      '24時間入退室可能',
      '食事サポート・栄養指導付き',
    ],
    cta_text: '無料体験トレーニングを予約する',
    line_cta_text: 'LINEで体験予約する',
    line_benefit: 'LINE登録で無料体験+入会金30,000円免除',
    suggested_primary_color: '#2563eb',
    suggested_accent_color: '#eff6ff',
    suggested_image_keywords: ['パーソナルジム トレーニング', 'ジム 内装 スタイリッシュ', 'ダイエット 成果'],
    target_keywords: ['パーソナルジム 渋谷', '渋谷 ジム ダイエット', 'パーソナルトレーニング 渋谷 おすすめ'],
    ad_headline_template: '【渋谷】パーソナルジム｜無料体験+入会金無料',
  },
}

export function getTemplate(industryId: string): LPTemplate | undefined {
  return LP_TEMPLATES[industryId]
}

// Apply template to LP data object (used during store registration)
export function applyTemplateToLP(template: LPTemplate, storeName: string, address?: string) {
  return {
    catch_copy: template.catch_copy.replace('渋谷', address?.includes('渋谷') ? '渋谷' : address || ''),
    line_button_url: '', // filled in by owner
    services: template.services,
    appeal_points: template.appeal_points,
    features: template.features,
    cta_text: template.cta_text,
    line_cta_text: template.line_cta_text,
    line_benefit: template.line_benefit,
  }
}
