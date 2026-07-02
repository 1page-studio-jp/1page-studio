import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/admin/analyses/[id]  — partner edits AI-generated analysis
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    const body = await req.json()
    const { strengths, weaknesses, suggestions, priorities, partner_note } = body

    const updates: Record<string, any> = {
      is_partner_edited: true,
      edited_at: new Date().toISOString(),
      edited_by: user.id,
    }
    if (strengths !== undefined) updates.strengths = strengths
    if (weaknesses !== undefined) updates.weaknesses = weaknesses
    if (suggestions !== undefined) updates.suggestions = suggestions
    if (priorities !== undefined) updates.priorities = priorities
    if (partner_note !== undefined) updates.partner_note = partner_note

    const { data: analysis, error } = await supabase
      .from('store_analyses')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      store_id: analysis.store_id,
      action: 'analysis_partner_edited',
      target_type: 'store_analysis',
      target_id: params.id,
    })

    return NextResponse.json({ analysis })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/admin/analyses/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: analysis, error } = await supabase
      .from('store_analyses')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !analysis) return NextResponse.json({ error: '分析が見つかりません' }, { status: 404 })

    return NextResponse.json({ analysis })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
