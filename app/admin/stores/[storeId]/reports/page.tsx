import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ReportManager } from './report-manager'

interface Props {
  params: { storeId: string }
}

export default async function AdminReportsPage({ params }: Props) {
  const supabase = createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('id', params.storeId)
    .single()

  if (!store) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ææ¬¡ã¬ãã¼ãçæ</h1>
        <p className="text-muted-foreground mt-1">{store.store_name}</p>
      </div>
      <ReportManager storeId={store.id} storeName={store.store_name} />
    </div>
  )
}
