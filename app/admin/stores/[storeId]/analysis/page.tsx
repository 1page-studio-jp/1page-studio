import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { AnalysisManager } from './analysis-manager'

interface Props { params: { storeId: string } }

export default async function AdminAnalysisPage({ params }: Props) {
  const supabase = createClient()

  const { data: store } = await supabase
    .from('stores').select('id, store_name').eq('id', params.storeId).single()
  if (!store) notFound()

  const { data: analyses } = await supabase
    .from('store_analyses')
    .select('*')
    .eq('store_id', params.storeId)
    .order('analysis_date', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AIåæç®¡ç</h1>
        <p className="text-muted-foreground mt-1">{store.store_name}</p>
      </div>
      <AnalysisManager storeId={store.id} storeName={store.store_name} analyses={analyses || []} />
    </div>
  )
}
