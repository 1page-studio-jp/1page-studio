import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const storeId = searchParams.get('state')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !storeId) {
    return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?error=meta_oauth_failed`)
  }

  try {
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: `${appUrl}/api/oauth/meta/callback`,
      code,
    })}`)
    const tokens = await tokenRes.json()

    if (tokens.error) {
      return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?error=token_exchange_failed`)
    }

    // 長期トークンに交換
    const longTermRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: tokens.access_token,
    })}`)
    const longTermToken = await longTermRes.json()

    // 広告アカウントID取得
    const adAccountRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?access_token=${longTermToken.access_token || tokens.access_token}`
    )
    const adAccounts = await adAccountRes.json()
    const accountId = adAccounts.data?.[0]?.id || ''
    const accountName = adAccounts.data?.[0]?.name || ''

    const supabase = createClient()
    await supabase.from('store_oauth_tokens').upsert({
      store_id: storeId,
      provider: 'meta_ads',
      access_token: longTermToken.access_token || tokens.access_token,
      refresh_token: null,
      token_expires_at: longTermToken.expires_in
        ? new Date(Date.now() + longTermToken.expires_in * 1000).toISOString()
        : null,
      account_id: accountId,
      account_name: accountName,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store_id,provider' })

    return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?success=meta_connected`)
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/dashboard/${storeId}/settings?error=server_error`)
  }
}
