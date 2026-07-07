import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 全アクティブ店舗を取得
    const { data: stores } = await supabase
      .from('stores')
      .select('id, store_name, slug, status')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (!stores || stores.length === 0) return NextResponse.json([])

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // 各店舗の最新LP更新日を確認
    const staleStores = await Promise.all(
      stores.map(async store => {
        const { data: lp } = await supabase
          .from('lp_pages')
          .select('id, status, created_at, updated_at')
          .eq('store_id', store.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!lp) {
          return { ...store, lastLpDate: null, daysSinceUpdate: null, hasPublished: false, lpId: null }
        }

        const lastDate = lp.updated_at || lp.created_at
        const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (24 * 60 * 60 * 1000))
        const isStale = days >= 14

        return {
          ...store,
          lastLpDate: lastDate.split('T')[0],
          daysSinceUpdate: days,
          hasPublished: lp.status === 'published',
          lpId: lp.id,
          isStale,
        }
      })
    )

    // 停滞している店舗のみ返す（14日以上更新なし or LP未作成）
    const alerts = staleStores.filter(s => s.daysSinceUpdate === null || s.isStale)
    alerts.sort((a, b) => (b.daysSinceUpdate || 999) - (a.daysSinceUpdate || 999))

    return NextResponse.json(alerts)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
