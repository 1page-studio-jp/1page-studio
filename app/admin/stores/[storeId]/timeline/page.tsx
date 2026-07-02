import { createClient } from '@/lib/supabase/server'
import { MilestoneManager } from './milestone-manager'

export default async function AdminTimelinePage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()

  const [{ data: store }, { data: milestones }] = await Promise.all([
    supabase.from('stores').select('store_name').eq('id', params.storeId).single(),
    supabase.from('store_milestones')
      .select('*')
      .eq('store_id', params.storeId)
      .is('deleted_at', null)
      .order('happened_at', { ascending: false }),
  ])

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">タイムライン管理</h1>
        <p className="text-muted-foreground mt-1">{store?.store_name} の改善履歴を管理</p>
      </div>
      <MilestoneManager
        storeId={params.storeId}
        initialMilestones={milestones ?? []}
      />
    </div>
  )
}
