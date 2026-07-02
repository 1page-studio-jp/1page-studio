import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ja-JP').format(n)
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

export function calcROAS(sales: number, cost: number): number {
  if (cost === 0) return 0
  return Math.round((sales / cost) * 100) / 100
}

export function calcCPA(cost: number, conversions: number): number {
  if (conversions === 0) return 0
  return Math.round(cost / conversions)
}

export function calcCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0
  return Math.round((clicks / impressions) * 10000) / 100
}

export function calcCVR(conversions: number, clicks: number): number {
  if (clicks === 0) return 0
  return Math.round((conversions / clicks) * 10000) / 100
}

/** 集客スコアを0〜100で算出 */
export function calcScore(metrics: {
  lineAddRate: number   // LINE登録率 (LP views対比)
  inquiryRate: number   // 問い合わせ率
  reservationRate: number // 予約率
  couponUseRate: number // クーポン利用率
  roas: number          // ROAS
}): number {
  const weights = {
    lineAddRate: 30,
    inquiryRate: 25,
    reservationRate: 25,
    couponUseRate: 10,
    roas: 10,
  }

  const normalize = (val: number, max: number) => Math.min(val / max, 1)

  const score =
    normalize(metrics.lineAddRate, 5) * weights.lineAddRate +
    normalize(metrics.inquiryRate, 3) * weights.inquiryRate +
    normalize(metrics.reservationRate, 2) * weights.reservationRate +
    normalize(metrics.couponUseRate, 20) * weights.couponUseRate +
    normalize(metrics.roas, 5) * weights.roas

  return Math.round(score)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    google_ads: 'Google広告',
    google_map: 'Googleマップ',
    facebook: 'Facebook',
    instagram: 'Instagram',
    line: 'LINE',
    lp: 'LP',
    organic: 'オーガニック',
    other: 'その他',
  }
  return labels[platform] ?? platform
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: '稼働中',
    inactive: '停止中',
    trial: 'トライアル',
    canceled: '解約',
    draft: '下書き',
    published: '公開中',
    archived: 'アーカイブ',
    new: '未対応',
    contacted: '対応済み',
    reserved: '予約済み',
    closed: '完了',
    canceled: 'キャンセル',
  }
  return labels[status] ?? status
}
