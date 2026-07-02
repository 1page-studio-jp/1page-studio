import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/notes?store_id=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('store_id')
    if (!storeId) return NextResponse.json({ error: 'store_id が必要です' }, { status: 400 })

    const { data: notes, error } = await supabase
      .from('partner_notes')
      .select('*, profiles(name)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ notes })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/notes
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    const { store_id, content, is_private } = await req.json()
    if (!store_id || !content?.trim()) {
      return NextResponse.json({ error: '内容を入力してください' }, { status: 400 })
    }

    const { data: note, error } = await supabase
      .from('partner_notes')
      .insert({ store_id, author_id: user.id, content: content.trim(), is_private: !!is_private })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      store_id,
      action: 'partner_note_created',
      target_type: 'partner_note',
      target_id: note.id,
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/notes?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id が必要です' }, { status: 400 })

    const { error } = await supabase.from('partner_notes').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
