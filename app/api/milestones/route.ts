import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const storeId = req.nextUrl.searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('store_milestones')
    .select('*')
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .order('happened_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 管理者確認
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { store_id, title, description, category, happened_at, metric_label, metric_value, metric_up } = body

  if (!store_id || !title || !happened_at) {
    return NextResponse.json({ error: 'store_id, title, happened_at are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('store_milestones')
    .insert({
      store_id, title, description,
      category: category ?? 'other',
      happened_at, metric_label, metric_value,
      metric_up: metric_up ?? true,
      created_by: user.id,
      is_auto: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
