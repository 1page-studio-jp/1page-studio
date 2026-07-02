import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { SuccessCasesManager } from './success-cases-manager'

export default async function AdminSuccessCasesPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: cases } = await supabase
    .from('success_cases')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">成功事例ライブラリ</h1>
        <p className="text-muted-foreground mt-1">
          業種別の成功事例を蓄積し、次の店舗への横展開に活用します
        </p>
      </div>
      <SuccessCasesManager cases={cases || []} />
    </div>
  )
}
