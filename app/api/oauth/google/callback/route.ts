import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const storeId = searchParams.get('state')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !storeId) {
    return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?error=google_oauth_failed`)
  }

  try {
    // コードをトークンに交換
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()

    if (tokens.error) {
      console.error('Google token error:', tokens.error)
      return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?error=token_exchange_failed`)
    }

    // Google Ads カスタマーIDを取得
    const customerRes = await fetch('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      }
    })
    const customerData = await customerRes.json()
    const accountId = customerData.resourceNames?.[0]?.replace('customers/', '') || ''

    // Supabaseに保存
    const supabase = createClient()
    await supabase.from('store_oauth_tokens').upsert({
      store_id: storeId,
      provider: 'google_ads',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      account_id: accountId,
      scopes: tokens.scope,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store_id,provider' })

    return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?success=google_connected`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?error=server_error`)
  }
}
