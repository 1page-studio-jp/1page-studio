import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAiComment } from '@/lib/openai'
import { calcROAS, calcCPA } from '@/lib/utils'
import { format, subDays } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { store_id } = await req.json()
    if (!store_id) return NextResponse.json({ error: 'store_id が必要です' }, { status: 400 })

    // 店舗情報（RLSで権限チェック）
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('store_name, industry')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    // 過去30日のデータ
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const { data: reports } = await supabase
      .from('ad_daily_reports')
      .select('cost, sales, lp_views, line_adds, inquiries, reservations, coupon_uses, platform')
      .eq('store_id', store_id)
      .gte('date', thirtyDaysAgo)

    if (!reports || reports.length === 0) {
      return NextResponse.json({ error: 'データが不足しています。まず広告データを入力してください。' }, { status: 400 })
    }

    const summary = reports.reduce((acc, r) => ({
      cost:         acc.cost         + Number(r.cost         || 0),
      sales:        acc.sales        + Number(r.sales        || 0),
      lp_views:     acc.lp_views     + (r.lp_views           || 0),
      line_adds:    acc.line_adds    + (r.line_adds           || 0),
      inquiries:    acc.inquiries    + (r.inquiries           || 0),
      reservations: acc.reservations + (r.reservations        || 0),
      coupon_uses:  acc.coupon_uses  + (r.coupon_uses         || 0),
    }), { cost: 0, sales: 0, lp_views: 0, line_adds: 0, inquiries: 0, reservations: 0, coupon_uses: 0 })

    // 最多プラットフォーム
    const platformCounts: Record<string, number> = {}
    reports.forEach(r => {
      if (r.platform) platformCounts[r.platform] = (platformCounts[r.platform] ?? 0) + 1
    })
    const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'その他'

    const platformLabels: Record<string, string> = {
      google_ads: 'Google広告',
      facebook:   'Meta広告',
      line:       'LINE広告',
      other:      'その他',
    }

    const result = await generateAiComment({
      storeName:   store.store_name,
      industry:    store.industry ?? '美容・健康',
      period:      '過去30日間',
      cost:        summary.cost,
      sales:       summary.sales,
      roas:        calcROAS(summary.sales, summary.cost),
      cpa:         calcCPA(summary.cost, summary.inquiries),
      lpViews:     summary.lp_views,
      lineAdds:    summary.line_adds,
      lineAddRate: summary.lp_views > 0 ? (summary.line_adds / summary.lp_views) * 100 : 0,
      inquiries:   summary.inquiries,
      reservations: summary.reservations,
      couponUses:  summary.coupon_uses,
      topPlatform: platformLabels[topPlatform] ?? topPlatform,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
