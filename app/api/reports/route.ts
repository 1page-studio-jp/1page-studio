import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** 広告レポートデータ取得 (日別) */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const storeId = req.nextUrl.searchParams.get('store_id')
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    if (!storeId) return NextResponse.json({ error: 'store_id が必要です' }, { status: 400 })

    let query = supabase
      .from('ad_daily_reports')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: true })

    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)

    const { data: reports, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ reports })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/** 手動で広告データを入力 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const body = await req.json()
    const {
      store_id, date, platform,
      impressions, clicks,
      cost,        // 広告費
      sales,       // 売上
      inquiries,   // コンバージョン（問い合わせ数）
      line_adds,
    } = body

    if (!store_id || !date || !platform) {
      return NextResponse.json({ error: 'store_id, date, platform は必須です' }, { status: 400 })
    }

    const { data: report, error } = await supabase
      .from('ad_daily_reports')
      .upsert({
        store_id,
        date,
        platform,
        impressions:  impressions  || 0,
        clicks:       clicks       || 0,
        cost:         cost         || 0,
        sales:        sales        || 0,
        inquiries:    inquiries    || 0,
        line_adds:    line_adds    || 0,
        data_source: 'manual',
      }, { onConflict: 'store_id,date,platform' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ report }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
