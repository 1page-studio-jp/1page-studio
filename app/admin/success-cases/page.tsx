import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { SuccessCasesManager } from './success-cases-manager'

export default async function AdminSuccessCasesPage() {
  const supabase = createClient()

  const { data: cases } = await supabase
    .from('success_cases')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">æåäºä¾ã©ã¤ãã©ãª</h1>
        <p className="text-muted-foreground mt-1">
          æ¥­ç¨®å¥ã®æåäºä¾ãèç©ããæ¬¡ã®åºèã¸ã®æ¨ªå±éã«æ´»ç¨ãã¾ã
        </p>
      </div>
      <SuccessCasesManager cases={cases || []} />
    </div>
  )
}
