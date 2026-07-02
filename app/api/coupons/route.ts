import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const storeId = req.nextUrl.searchParams.get('store_id')
    if (!storeId) return NextResponse.json({ error: 'store_id が必要です' }, { status: 400 })

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ coupons })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const body = await req.json()
    const {
      store_id, title, description, discount_type, discount_value,
      valid_from, valid_until, usage_limit, coupon_code, is_active,
    } = body

    if (!store_id || !title) {
      return NextResponse.json({ error: 'store_id と title は必須です' }, { status: 400 })
    }

    const { data: coupon, error } = await supabase
      .from('coupons')
      .insert({
        store_id,
        title,
        description,
        discount_type: discount_type || 'percent',
        discount_value: discount_value || 0,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
        usage_limit: usage_limit || null,
        coupon_code: coupon_code || null,
        is_active: is_active !== false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
