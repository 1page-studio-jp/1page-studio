import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { PartnerCommentEditor } from './partner-comment-editor'

interface Props {
  params: { storeId: string }
}

export default async function PartnerCommentPage({ params }: Props) {
  const supabase = createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('id', params.storeId)
    .single()

  if (!store) notFound()

  // Load last 3 months of comments
  const { data: comments } = await supabase
    .from('ai_comments')
    .select('id, comment, todos, generated_at, is_manual, partner_name')
    .eq('store_id', params.storeId)
    .order('generated_at', { ascending: false })
    .limit(6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">æå½ãã¼ããã¼ã³ã¡ã³ã</h1>
        <p className="text-muted-foreground mt-1">{store.store_name}</p>
      </div>
      <PartnerCommentEditor
        storeId={store.id}
        storeName={store.store_name}
        comments={comments || []}
      />
    </div>
  )
}
