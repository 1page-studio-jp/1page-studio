import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

function buildEmailHtml(params: {
  storeName: string
  monthLabel: string
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  cvr: number
  cost: number
  dashboardUrl: string
}) {
  const { storeName, monthLabel, impressions, clicks, ctr, conversions, cvr, cost, dashboardUrl } = params
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${monthLabel}月次レポート</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:'Hiragino Sans',sans-serif">
<div style="max-width:600px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7C3AED,#EC4899);padding:32px 40px">
    <div style="font-size:12px;color:rgba(255,255,255,.7);margin-bottom:8px;letter-spacing:.1em">MONTHLY REPORT</div>
    <h1 style="color:white;font-size:22px;font-weight:800;margin:0 0 4px">${monthLabel}の実績レポート</h1>
    <p style="color:rgba(255,255,255,.85);font-size:15px;margin:0">${storeName}</p>
  </div>

  <!-- Stats grid -->
  <div style="padding:32px 40px 24px">
    <p style="color:#6B7280;font-size:13px;margin:0 0 20px">先月の広告パフォーマンスをまとめました。</p>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center;width:50%">
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px;letter-spacing:.06em">インプレッション</div>
          <div style="font-size:26px;font-weight:900;color:#111827">${impressions.toLocaleString()}</div>
        </td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center;width:50%">
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px;letter-spacing:.06em">クリック数</div>
          <div style="font-size:26px;font-weight:900;color:#111827">${clicks.toLocaleString()}</div>
        </td>
      </tr>
      <tr><td colspan="3" style="height:8px"></td></tr>
      <tr>
        <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center">
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px;letter-spacing:.06em">CTR</div>
          <div style="font-size:26px;font-weight:900;color:#7C3AED">${ctr.toFixed(2)}%</div>
        </td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center">
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px;letter-spacing:.06em">コンバージョン</div>
          <div style="font-size:26px;font-weight:900;color:#111827">${conversions}</div>
        </td>
      </tr>
      <tr><td colspan="3" style="height:8px"></td></tr>
      <tr>
        <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center">
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px;letter-spacing:.06em">CVR</div>
          <div style="font-size:26px;font-weight:900;color:#EC4899">${cvr.toFixed(2)}%</div>
        </td>
        <td style="width:8px"></td>
        <td style="padding:12px;background:#F9FAFB;border-radius:10px;text-align:center">
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px;letter-spacing:.06em">広告費</div>
          <div style="font-size:26px;font-weight:900;color:#111827">¥${cost.toLocaleString()}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- CTA -->
  <div style="padding:0 40px 40px;text-align:center">
    <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#EC4899);color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:15px;letter-spacing:.02em">
      ダッシュボードで詳細を確認する →
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 40px;text-align:center">
    <p style="color:#9CA3AF;font-size:12px;margin:0">このメールは <strong style="color:#7C3AED">1Page Studio</strong> から自動送信されています</p>
  </div>
</div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
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

  const results: Array<{ store: string; email: string | null; status: string }> = []

  try {
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
        const { data: reports } = await supabase
          .from('ad_daily_reports')
          .select('impressions, clicks, conversions, cost')
          .eq('store_id', store.id)
          .gte('date', from)
          .lte('date', to)

        const totals = (reports || []).reduce(
          (acc, r) => ({
            impressions: acc.impressions + (r.impressions || 0),
            clicks: acc.clicks + (r.clicks || 0),
            conversions: acc.conversions + (r.conversions || 0),
            cost: acc.cost + (r.cost || 0),
          }),
          { impressions: 0, clicks: 0, conversions: 0, cost: 0 }
        )

        const cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0
        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

        await supabase.from('monthly_reports').upsert(
          {
            store_id: store.id,
            month: monthKey,
            impressions: totals.impressions,
            clicks: totals.clicks,
            conversions: totals.conversions,
            cost: totals.cost,
            cvr: Math.round(cvr * 100) / 100,
            ctr: Math.round(ctr * 100) / 100,
          },
          { onConflict: 'store_id,month' }
        )

        if (resend && store.email) {
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://1page-studio.vercel.app'}/dashboard`
          const html = buildEmailHtml({
            storeName: store.store_name,
            monthLabel,
            impressions: totals.impressions,
            clicks: totals.clicks,
            ctr: Math.round(ctr * 100) / 100,
            conversions: totals.conversions,
            cvr: Math.round(cvr * 100) / 100,
            cost: totals.cost,
            dashboardUrl,
          })

          const { error: emailError } = await resend.emails.send({
            from: FROM_EMAIL,
            to: store.email,
            subject: `【1Page Studio】${monthLabel}の月次レポート - ${store.store_name}`,
            html,
          })

          if (emailError) {
            console.error(`[Monthly Report] Email error for ${store.store_name}:`, emailError)
            results.push({ store: store.store_name, email: store.email, status: `email_error: ${emailError.message}` })
          } else {
            results.push({ store: store.store_name, email: store.email, status: 'sent' })
          }
        } else {
          const reason = !resend ? 'RESEND_API_KEY not set' : 'no email address'
          console.log(`[Monthly Report] Skipped email for ${store.store_name}: ${reason}`)
          results.push({ store: store.store_name, email: store.email, status: `saved (${reason})` })
        }
      } catch (e: any) {
        results.push({ store: store.store_name, email: store.email, status: `error: ${e.message}` })
      }
    }

    return NextResponse.json({ ok: true, month: monthLabel, processed: results.length, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
