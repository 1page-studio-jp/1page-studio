import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 全店舗取得
export async function GET() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, store_name, category, area, status, slug, created_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// 新規店舗作成（オーナーアカウントも同時作成）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      store_name, category, area, address, phone_number,
      business_hours, slug, owner_email, owner_password, owner_name,
    } = body

    if (!store_name || !owner_email || !owner_password) {
      return NextResponse.json({ error: '店舗名・オーナーメール・パスワードは必須です' }, { status: 400 })
    }

    // 1. オーナーアカウントをSupabase Authに作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      user_metadata: { name: owner_name || store_name + ' オーナー', role: 'owner' },
      email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: 'オーナーアカウント作成失敗: ' + authError.message }, { status: 400 })

    const ownerId = authData.user.id

    // 2. スラッグ重複チェック・自動採番
    let finalSlug = slug
    if (finalSlug) {
      const { data: existing } = await supabase.from('stores').select('id').eq('slug', finalSlug).single()
      if (existing) finalSlug = finalSlug + '-' + Date.now().toString().slice(-4)
    }

    // 3. 店舗レコード作成
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        store_name, category, area, address, phone_number,
        business_hours, slug: finalSlug,
        owner_id: ownerId, status: 'active',
      })
      .select()
      .single()

    if (storeError) {
      // ロールバック: 作成したユーザーを削除
      await supabase.auth.admin.deleteUser(ownerId)
      return NextResponse.json({ error: '店舗作成失敗: ' + storeError.message }, { status: 500 })
    }

    return NextResponse.json({ store, owner: { email: owner_email, id: ownerId } }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
