import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAiComment } from '@/lib/openai'
import { calcROAS, calcCPA, getPlatformLabel } from '@/lib/utils'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    const body = await req.json()
    const { store_id } = body

    // 店舗情報
    const { data: store } = await supabase.from('stores').select('*').eq('id', store_id).single()
    if (!store) return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 })

    // 今月のデータ
    const today = new Date()
    const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

    const { data: reports } = await supabase
      .from('ad_daily_reports')
      .select('*')
      .eq('store_id', store_id)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    const summary = (reports ?? []).reduce((acc, r) => ({
      cost: acc.cost + Number(r.cost),
      sales: acc.sales + Number(r.sales),
      lp_views: acc.lp_views + r.lp_views,
      line_adds: acc.line_adds + r.line_adds,
      inquiries: acc.inquiries + r.inquiries,
      reservations: acc.reservations + r.reservations,
      coupon_uses: acc.coupon_uses + r.coupon_uses,
    }), { cost: 0, sales: 0, lp_views: 0, line_adds: 0, inquiries: 0, reservations: 0, coupon_uses: 0 })

    // 最多プラットフォーム
    const platformCounts: Record<string, number> = {}
    ;(reports ?? []).forEach(r => {
      platformCounts[r.platform] = (platformCounts[r.platform] ?? 0) + r.line_adds + r.inquiries
    })
    const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'organic'

    // AI生成
    const aiResult = await generateAiComment({
      storeName: store.store_name,
      industry: store.industry ?? '',
      period: `${format(today, 'yyyy年M月')}`,
      cost: summary.cost,
      sales: summary.sales,
      roas: calcROAS(summary.sales, summary.cost),
      cpa: calcCPA(summary.cost, summary.inquiries),
      lpViews: summary.lp_views,
      lineAdds: summary.line_adds,
      lineAddRate: summary.lp_views > 0 ? (summary.line_adds / summary.lp_views) * 100 : 0,
      inquiries: summary.inquiries,
      reservations: summary.reservations,
      couponUses: summary.coupon_uses,
      topPlatform: getPlatformLabel(topPlatform),
    })

    // AIコメントを保存（承認待ち）
    const { data: comment } = await supabase
      .from('ai_comments')
      .insert({
        store_id,
        content: aiResult.comment,
        todos: aiResult.todos,
        approved: false,
      })
      .select()
      .single()

    // 改善提案を保存
    const suggestions = aiResult.suggestions.map(s => ({
      store_id,
      suggestion_type: s.type,
      title: s.title,
      description: s.description,
      priority: s.priority,
      status: 'new',
    }))

    if (suggestions.length > 0) {
      await supabase.from('improvement_suggestions').insert(suggestions)
    }

    return NextResponse.json({ comment, suggestions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// AIコメントを承認する
export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { comment_id } = await req.json()

    const { data, error } = await supabase
      .from('ai_comments')
      .update({ approved: true, approved_by: user.id })
      .eq('id', comment_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ comment: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
