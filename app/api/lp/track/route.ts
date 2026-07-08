import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { slug, type } = await request.json()
    if (!slug || !['view', 'line_click'].includes(type)) {
      return NextResponse.json({ ok: false, error: 'invalid params' }, { status: 400 })
    }
    await supabase.rpc('increment_lp_count', { p_slug: slug, p_type: type })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
