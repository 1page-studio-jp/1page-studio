import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  // Vercel Cronからのリクエストのみ受け付ける
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== 'Bearer ' + cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const from = lastMonth.toISOString().split('T')[0]
  const to = lastMonthEnd.toISOString().split('T')[0]
  const monthLabel = `${lastMonth.getFullYear()}年${lastMonth.getMonth() + 1}月`
  const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`

  const results: Array<{ store: string, email: string | null, status: string }> = []

  try {
    // アクティブ店舗一覧（store.emailを使用）
    const { data: stores } = await supabase
      .from('stores')
      .select('id, store_name, slug, email')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (!stores || stores.length === 0) {
      return NextResponse.json({ ok: true, message: 'No active stores', processed: 0 })
    }

    for (const store of stores) {
      try {
        // 先月の広告データを集計
        const { data: reports } = await supabase
          .from('ad_daily_reports')
          .select('impressions, clicks, conversions, cost')
          .eq('store_id', store.id)
          .gte('date', from)
          .lte('date', to)

        const totals = (reports || []).reduce((acc, r) => ({
          impressions: acc.impressions + (r.impressions || 0),
          clicks: acc.clicks + (r.clicks || 0),
          conversions: acc.conversions + (r.conversions || 0),
          cost: acc.cost + (r.cost || 0)
        }), { impressions: 0, clicks: 0, conversions: 0, cost: 0 })

        const cvr = totals.clicks > 0 ? totals.conversions / totals.clicks * 100 : 0
        const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions * 100 : 0

        // 月次レポートをDBに保存
        await supabase.from('monthly_reports').upsert({
          store_id: store.id,
          month: monthKey,
          impressions: totals.impressions,
          clicks: totals.clicks,
          conversions: totals.conversions,
          cost: totals.cost,
          cvr: Math.round(cvr * 100) / 100,
          ctr: Math.round(ctr * 100) / 100
        }, { onConflict: 'store_id,month' })

        // メール内容を生成（実装時にメールサービスに送信）
        const emailBody = `
【${monthLabel}月次レポート】${store.store_name}

■ 先月の実績
- インプレッション: ${totals.impressions.toLocaleString()}
- クリック数: ${totals.clicks.toLocaleString()}
- CTR: ${ctr.toFixed(2)}%
- コンバージョン: ${totals.conversions}
- CVR: ${cvr.toFixed(2)}%
- 広告費: ¥${totals.cost.toLocaleString()}

■ 詳細はダッシュボードでご確認ください
https://1page-studio.vercel.app/dashboard
`

        console.log(`[Monthly Report] ${store.store_name} (${store.email || 'no email'})`, emailBody)
        
        // TODO: メールサービス連携時はここでメール送信
        // await sendEmail({ to: store.email, subject: `${monthLabel}月次レポート`, body: emailBody })

        results.push({ store: store.store_name, email: store.email, status: 'saved' })
      } catch (e: any) {
        results.push({ store: store.store_name, email: store.email, status: `error: ${e.message}` })
      }
    }

    return NextResponse.json({ ok: true, month: monthLabel, processed: results.length, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
