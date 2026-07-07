import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// LP一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const { data, error } = await supabase
    .from('lp_pages')
    .select('*')
    .eq('store_id', params.storeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// 新規LP作成
export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const body = await request.json()
  const {
    appeal_angle,
    catch_copy, sub_copy, service_description,
    strengths, appeal_points,
    line_cta_text, line_benefit,
    seo_title, seo_description,
    status = 'draft',
    primary_color, accent_color,
  } = body

  const { data, error } = await supabase
    .from('lp_pages')
    .insert({
      store_id: params.storeId,
      appeal_angle,
      catch_copy,
      sub_copy,
      service_description,
      strengths,
      appeal_points,
      line_cta_text,
      line_benefit,
      seo_title,
      seo_description,
      status,
      primary_color: primary_color || '#7C3AED',
      accent_color: accent_color || '#EC4899',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
