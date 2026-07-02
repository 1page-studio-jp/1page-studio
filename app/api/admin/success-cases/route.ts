import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/success-cases?industry=salon&case_type=coupon
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const industry = searchParams.get('industry')
    const caseType = searchParams.get('case_type')
    const featured = searchParams.get('featured')

    let query = supabase
      .from('success_cases')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (industry) query = query.eq('industry_id', industry)
    if (caseType) query = query.eq('case_type', caseType)
    if (featured === 'true') query = query.eq('is_featured', true)

    const { data: cases, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ cases })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/success-cases
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみ実行可能です' }, { status: 403 })
    }

    const body = await req.json()
    const { industry_id, case_type, title, result_summary, result_metric, content, tags, is_featured, source_store_id } = body

    if (!industry_id || !case_type || !title || !result_summary) {
      return NextResponse.json({ error: '必須項目が不足しています（業種・種別・タイトル・結果）' }, { status: 400 })
    }

    const { data: successCase, error } = await supabase
      .from('success_cases')
      .insert({
        industry_id,
        case_type,
        title: title.trim(),
        result_summary: result_summary.trim(),
        result_metric: result_metric?.trim() || null,
        content: content?.trim() || null,
        tags: tags || [],
        is_featured: !!is_featured,
        source_store_id: source_store_id || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ case: successCase }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
