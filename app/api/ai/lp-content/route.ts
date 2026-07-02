import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateLpContent } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { storeId, industry, features, targetCustomer } = await req.json()

    const { data: store } = await supabase.from('stores').select('store_name').eq('id', storeId).single()
    if (!store) return NextResponse.json({ error: '店舗が見つかりません' }, { status: 404 })

    const result = await generateLpContent({
      storeName: store.store_name,
      industry: industry || 'その他',
      features: features || '',
      targetCustomer: targetCustomer || '一般の方',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
