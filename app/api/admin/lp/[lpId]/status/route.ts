import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: { lpId: string } }
) {
  const { status, store_id } = await request.json()

  // publishに変える場合は他のLPをarchiveに
  if (status === 'published' && store_id) {
    await supabase
      .from('lp_pages')
      .update({ status: 'archived' })
      .eq('store_id', store_id)
      .eq('status', 'published')
      .neq('id', params.lpId)
  }

  const { data, error } = await supabase
    .from('lp_pages')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.lpId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
