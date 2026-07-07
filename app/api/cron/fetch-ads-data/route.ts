import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel Cron認証
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSync()
}

// 手動実行（管理者から呼び出し可能）
export async function POST(request: Request) {
  return runSync()
}

async function runSync() {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const syncResults = []

  // アクティブなOAuthトークンを全店舗分取得
  const { data: tokens } = await supabase
    .from('store_oauth_tokens')
    .select('*')
    .eq('is_active', true)

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ message: 'No active tokens', synced: 0 })
  }

  for (const token of tokens) {
    try {
      if (token.provider === 'google_ads') {
        await syncGoogleAds(token, yesterday, syncResults)
      } else if (token.provider === 'meta_ads') {
        await syncMetaAds(token, yesterday, syncResults)
      }
    } catch (err) {
      console.error(`Sync error for store ${token.store_id} (${token.provider}):`, err)
      await supabase.from('ads_sync_logs').insert({
        store_id: token.store_id,
        provider: token.provider,
        sync_date: yesterday,
        status: 'error',
        error_message: String(err),
      })
    }
  }

  return NextResponse.json({ synced: syncResults.length, results: syncResults, date: yesterday })
}

async function refreshGoogleToken(token: any): Promise<string> {
  if (!token.refresh_token) throw new Error('No refresh token')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)

  await supabase.from('store_oauth_tokens').update({
    access_token: data.access_token,
    token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  }).eq('id', token.id)

  return data.access_token
}

async function syncGoogleAds(token: any, date: string, results: any[]) {
  let accessToken = token.access_token

  // トークン期限切れチェック
  if (token.token_expires_at && new Date(token.token_expires_at) < new Date()) {
    accessToken = await refreshGoogleToken(token)
  }

  if (!token.account_id) {
    await supabase.from('ads_sync_logs').insert({
      store_id: token.store_id, provider: 'google_ads',
      sync_date: date, status: 'skipped', error_message: 'No account_id'
    })
    return
  }

  // Google Ads API: 昨日のデータ取得
  const query = `
    SELECT
      campaign.id,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM campaign
    WHERE segments.date = '${date}'
    AND campaign.status = 'ENABLED'
  `

  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${token.account_id}/googleAds:search`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  const data = await res.json()

  if (data.error) throw new Error(JSON.stringify(data.error))

  // 集計
  const totals = (data.results || []).reduce(
    (acc: any, row: any) => ({
      cost: acc.cost + (parseInt(row.metrics?.costMicros || 0) / 1_000_000),
      impressions: acc.impressions + (parseInt(row.metrics?.impressions || 0)),
      clicks: acc.clicks + (parseInt(row.metrics?.clicks || 0)),
    }),
    { cost: 0, impressions: 0, clicks: 0 }
  )

  // ad_daily_reportsに挿入（既存なら更新）
  await supabase.from('ad_daily_reports').upsert({
    store_id: token.store_id,
    report_date: date,
    platform: 'google_ads',
    cost: Math.round(totals.cost),
    impressions: totals.impressions,
    clicks: totals.clicks,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'store_id,report_date,platform' })

  await supabase.from('store_oauth_tokens').update({ last_synced_at: new Date().toISOString() }).eq('id', token.id)
  await supabase.from('ads_sync_logs').insert({
    store_id: token.store_id, provider: 'google_ads',
    sync_date: date, status: 'success', records_inserted: 1
  })

  results.push({ store_id: token.store_id, provider: 'google_ads', cost: totals.cost })
}

async function syncMetaAds(token: any, date: string, results: any[]) {
  if (!token.account_id) {
    await supabase.from('ads_sync_logs').insert({
      store_id: token.store_id, provider: 'meta_ads',
      sync_date: date, status: 'skipped', error_message: 'No account_id'
    })
    return
  }

  const params = new URLSearchParams({
    access_token: token.access_token,
    fields: 'spend,impressions,clicks,actions',
    time_range: JSON.stringify({ since: date, until: date }),
    level: 'account',
  })

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${token.account_id}/insights?${params}`
  )
  const data = await res.json()

  if (data.error) throw new Error(JSON.stringify(data.error))

  const row = data.data?.[0]
  if (!row) {
    await supabase.from('ads_sync_logs').insert({
      store_id: token.store_id, provider: 'meta_ads',
      sync_date: date, status: 'skipped', error_message: 'No data for date'
    })
    return
  }

  // アクション（リンクのクリック数など）を取得
  const linkClicks = row.actions?.find((a: any) => a.action_type === 'link_click')?.value || 0

  await supabase.from('ad_daily_reports').upsert({
    store_id: token.store_id,
    report_date: date,
    platform: 'facebook',
    cost: Math.round(parseFloat(row.spend || 0)),
    impressions: parseInt(row.impressions || 0),
    clicks: parseInt(linkClicks),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'store_id,report_date,platform' })

  await supabase.from('store_oauth_tokens').update({ last_synced_at: new Date().toISOString() }).eq('id', token.id)
  await supabase.from('ads_sync_logs').insert({
    store_id: token.store_id, provider: 'meta_ads',
    sync_date: date, status: 'success', records_inserted: 1
  })

  results.push({ store_id: token.store_id, provider: 'meta_ads', spend: row.spend })
}
