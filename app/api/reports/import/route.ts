import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ImportRow {
  date: string
  impressions: number
  clicks: number
  cost: number
  sales: number
  inquiries: number
  line_adds: number
}

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const { store_id, platform, rows } = body as {
    store_id: string
    platform: string
    rows: ImportRow[]
  }

  if (!store_id || !platform || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'パラメータが不正です' }, { status: 400 })
  }

  // RLS経由で店舗へのアクセス権確認
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('id', store_id)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
  }

  // 同じ日付・プラットフォームの既存レコードを削除（上書き）
  const dates = [...new Set(rows.map(r => r.date))]
  const { error: deleteError } = await supabase
    .from('ad_daily_reports')
    .delete()
    .eq('store_id', store_id)
    .eq('platform', platform)
    .in('date', dates)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // 一括挿入
  const records = rows.map(r => ({
    store_id,
    platform,
    date:        r.date,
    impressions: Math.round(r.impressions) || 0,
    clicks:      Math.round(r.clicks)      || 0,
    cost:        r.cost                    || 0,
    sales:       r.sales                   || 0,
    inquiries:   Math.round(r.inquiries)   || 0,
    line_adds:   Math.round(r.line_adds)   || 0,
    lp_views:    0,
    data_source: 'csv_import',
  }))

  const { error: insertError } = await supabase
    .from('ad_daily_reports')
    .insert(records)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ imported: records.length })
}
