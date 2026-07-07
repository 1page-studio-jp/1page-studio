import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Vercel Cronからのリクエストのみ受け付ける
  if (request.headers.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const from = lastMonth.toISOString().split('T')[0]
    const to = lastMonthEnd.toISOString().split('T')[0]
    const monthLabel = `${lastMonth.getFullYear()}年${lastMonth.getMonth() + 1}月`

    // アクティブ店舗一覧を取得
    const { data: stores } = await supabase
      .from('stores')
      .select('id, store_name, slug, owner_id')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (!stores || stores.length === 0) {
      return NextResponse.json({ sent: 0, message: 'no active stores' })
    }

    let sent = 0
    const errors: string[] = []

    for (const store of stores) {
      try {
        // オーナーのメールアドレスを取得
        const { data: { user } } = await supabase.auth.admin.getUserById(store.owner_id)
        if (!user?.email) continue

        // 先月の広告データを集計
        const { data: ads } = await supabase
          .from('ad_daily_reports')
          .select('lp_views, line_adds, cost, sales')
          .eq('store_id', store.id)
          .gte('date', from)
          .lte('date', to)

        const totalViews = ads?.reduce((s, r) => s + (r.lp_views || 0), 0) || 0
        const totalAdds = ads?.reduce((s, r) => s + (r.line_adds || 0), 0) || 0
        const totalCost = ads?.reduce((s, r) => s + (r.cost || 0), 0) || 0
        const cvr = totalViews > 0 ? ((totalAdds / totalViews) * 100).toFixed(1) : '0.0'

        // 最新LP取得
        const { data: lp } = await supabase
          .from('lp_pages')
          .select('catch_copy, appeal_angle, status')
          .eq('store_id', store.id)
          .eq('status', 'published')
          .single()

        // メール送信（Supabase Auth経由）
        // 注: 本番ではSendGrid/Resendを使う。ここではconsole出力のみ
        console.log(`[Monthly Report] ${store.store_name} (${user.email}): views=${totalViews}, adds=${totalAdds}, cvr=${cvr}%, cost=¥${totalCost}`)
        
        // Supabaseのinviteを使ってメール送信（簡易版）
        // 実際のメール本文
        const emailBody = [
          `${store.store_name} 様`,
          '',
          `【${monthLabel}度 月次パフォーマンスレポート】`,
          '',
          `■ LP閲覧数: ${totalViews.toLocaleString()} 回`,
          `■ LINE追加数: ${totalAdds.toLocaleString()} 件`,
          `■ CVR: ${cvr}%`,
          `■ 広告費用: ¥${totalCost.toLocaleString()}`,
          '',
          lp ? `現在公開中のLP: ${lp.catch_copy || lp.appeal_angle || '（未設定）'}` : 'LPが公開されていません',
          '',
          `LP管理: https://1page-studio.vercel.app/lp/${store.slug}`,
          '',
          '1Page Studio チーム',
        ].join('\n')

        // ここではログのみ。実装時はSendGrid等のAPIを呼ぶ
        console.log(emailBody)
        sent++
      } catch (err: any) {
        errors.push(`${store.store_name}: ${err.message}`)
      }
    }

    return NextResponse.json({ 
      ok: true, 
      month: monthLabel,
      sent, 
      total: stores.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
