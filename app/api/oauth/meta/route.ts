import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const appId = process.env.META_APP_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/meta/callback`

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'ads_read,ads_management,read_insights',
    response_type: 'code',
    state: storeId,
  })

  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`)
}
