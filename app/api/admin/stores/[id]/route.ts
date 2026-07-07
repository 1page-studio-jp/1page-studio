import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** 管理者専用: 店舗情報を取得 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('stores')
    .select('id, store_name, category, area, address, phone_number, business_hours, slug, owner_id')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}


/** 管理者専用: 店舗情報を更新 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    // 管理者チェック
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    const body = await req.json()

    // 更新可能なフィールドのみホワイトリストで許可
    const allowedFields = [
      'store_name', 'industry', 'phone_number', 'address', 'email',
      'business_hours', 'status', 'website_url', 'postal_code',
    ]
    const updateData = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.includes(key))
    )

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '更新するフィールドがありません' }, { status: 400 })
    }

    // 論理削除
    if (updateData.status === 'canceled') {
      updateData.deleted_at = new Date().toISOString()
    }

    const { data: store, error } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // 操作ログ
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      store_id: params.id,
      action: 'admin_store_updated',
      target_type: 'store',
      target_id: params.id,
    })

    return NextResponse.json({ store })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** 管理者専用: 店舗を物理削除（慎重に使用） */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    // 論理削除（物理削除は行わない）
    const { error } = await supabase
      .from('stores')
      .update({ deleted_at: new Date().toISOString(), status: 'canceled' })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
