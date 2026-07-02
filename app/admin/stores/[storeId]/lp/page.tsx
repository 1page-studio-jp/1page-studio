import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { LpAdminEditor } from './lp-admin-editor'

interface Props { params: { storeId: string } }

export default async function AdminLpPage({ params }: Props) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const [{ data: store }, { data: lps }] = await Promise.all([
    supabase.from('stores').select('id, store_name, slug, industry, address').eq('id', params.storeId).single(),
    supabase.from('lp_pages').select('*').eq('store_id', params.storeId).is('deleted_at', null).order('created_at', { ascending: false }),
  ])

  if (!store) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LP管理・編集</h1>
        <p className="text-muted-foreground mt-1">{store.store_name}</p>
      </div>
      <LpAdminEditor store={store} lps={lps ?? []} />
    </div>
  )
}
