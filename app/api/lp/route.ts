import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const body = await req.json()
    const { store_id, ...lpData } = body

    // 権限チェック
    const { data: storeUser } = await supabase
      .from('store_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .single()

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!storeUser && profile?.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { data: lp, error } = await supabase
      .from('lp_pages')
      .insert({ store_id, ...lpData })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      store_id,
      action: 'lp_created',
      target_type: 'lp_page',
      target_id: lp.id,
    })

    return NextResponse.json({ lp }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
