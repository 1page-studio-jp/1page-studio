import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// LP公開フォームからの問い合わせ（認証不要）
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { store_id, customer_name, customer_phone, customer_email, message, source } = body

    if (!store_id) return NextResponse.json({ error: 'store_idが必要です' }, { status: 400 })

    // 店舗が存在するか確認
    const { data: store } = await supabase.from('stores').select('id').eq('id', store_id).single()
    if (!store) return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 })

    const { data, error } = await supabase.from('inquiries').insert({
      store_id,
      customer_name,
      customer_phone,
      customer_email,
      message,
      source: source ?? 'lp',
      status: 'new',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ inquiry: data }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
