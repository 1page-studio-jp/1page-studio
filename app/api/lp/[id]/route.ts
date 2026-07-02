import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const body = await req.json()

    // LPのstore_idを取得して権限チェック
    const { data: existing } = await supabase.from('lp_pages').select('store_id').eq('id', params.id).single()
    if (!existing) return NextResponse.json({ error: 'LPが見つかりません' }, { status: 404 })

    const { data: storeUser } = await supabase
      .from('store_users')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', existing.store_id)
      .single()

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!storeUser && profile?.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { data: lp, error } = await supabase
      .from('lp_pages')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      store_id: existing.store_id,
      action: 'lp_updated',
      target_type: 'lp_page',
      target_id: params.id,
    })

    return NextResponse.json({ lp })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    // 論理削除
    const { error } = await supabase
      .from('lp_pages')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
