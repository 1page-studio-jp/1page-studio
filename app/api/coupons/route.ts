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
            .from('coupons').select('*').eq('store_id', storeId).is('deleted_at', null)
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
          const { store_id, coupon_name, discount_description, usage_conditions, expiry_date, display_status } = body
          if (!store_id || !coupon_name) {
                  return NextResponse.json({ error: 'store_id と coupon_name は必須です' }, { status: 400 })
          }
          const { data: coupon, error } = await supabase
            .from('coupons')
            .insert({
                      store_id, coupon_name,
                      discount_description: discount_description || '',
                      usage_conditions: usage_conditions || null,
                      expiry_date: expiry_date || null,
                      display_status: display_status || 'visible',
            })
            .select().single()
          if (error) return NextResponse.json({ error: error.message }, { status: 400 })
          return NextResponse.json({ coupon }, { status: 201 })
    } catch (error: any) {
          return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
