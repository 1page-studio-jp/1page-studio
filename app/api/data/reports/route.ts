import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/data/reports?store_id=xxx&from=2024-03-01&to=2024-03-31
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('store_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!storeId) return NextResponse.json({ error: 'store_id が必要です' }, { status: 400 })

    let query = supabase
      .from('ad_daily_reports')
      .select('*')
      .eq('store_id', storeId)
      .order('date', { ascending: false })

    if (from) query = query.gte('date', from)
    if (to) query = query.lte('date', to)

    const { data: reports, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ reports })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/data/reports  — 手動データ入力（1日分）
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const body = await req.json()
    const {
      store_id,
      date,
      platform = 'other',
      campaign_name,
      cost = 0,
      impressions = 0,
      clicks = 0,
      lp_views = 0,
      line_adds = 0,
      inquiries = 0,
      reservations = 0,
      visits = 0,
      coupon_uses = 0,
      sales = 0,
    } = body

    if (!store_id || !date) {
      return NextResponse.json({ error: 'store_id と date は必須です' }, { status: 400 })
    }

    // Upsert: 同じ store_id + date + platform があれば更新
    const { data: report, error } = await supabase
      .from('ad_daily_reports')
      .upsert({
        store_id,
        date,
        platform,
        campaign_name: campaign_name || null,
        cost: Number(cost),
        impressions: Number(impressions),
        clicks: Number(clicks),
        lp_views: Number(lp_views),
        line_adds: Number(line_adds),
        inquiries: Number(inquiries),
        reservations: Number(reservations),
        visits: Number(visits),
        coupon_uses: Number(coupon_uses),
        sales: Number(sales),
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

// PUT /api/data/reports  — 一括入力（複数日分、CSVインポート後など）
export async function PUT(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { store_id, rows } = await req.json()
    if (!store_id || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'store_id と rows[] が必要です' }, { status: 400 })
    }

    const records = rows.map((r: any) => ({
      store_id,
      date: r.date,
      platform: r.platform || 'other',
      campaign_name: r.campaign_name || null,
      cost: Number(r.cost || 0),
      impressions: Number(r.impressions || 0),
      clicks: Number(r.clicks || 0),
      lp_views: Number(r.lp_views || 0),
      line_adds: Number(r.line_adds || 0),
      inquiries: Number(r.inquiries || 0),
      reservations: Number(r.reservations || 0),
      visits: Number(r.visits || 0),
      coupon_uses: Number(r.coupon_uses || 0),
      sales: Number(r.sales || 0),
      data_source: 'manual',
    }))

    const { data, error } = await supabase
      .from('ad_daily_reports')
      .upsert(records, { onConflict: 'store_id,date,platform' })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ inserted: data?.length, records: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
