import { createClient } from '@/lib/supabase/server'
import { InquiriesClient } from './inquiries-client'

export default async function InquiriesPage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('*')
    .eq('store_id', params.storeId)
    .order('created_at', { ascending: false })

  return (
    <InquiriesClient
      storeId={params.storeId}
      initialInquiries={inquiries ?? []}
    />
  )
}
