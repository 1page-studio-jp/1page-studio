import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { BookOpen, TrendingUp, Star, ChevronDown } from 'lucide-react'
import { getIndustry } from '@/lib/lp-templates'
import { SuccessCasesClient } from './success-cases-client'

interface Props {
  params: { storeId: string }
}

export default async function OwnerSuccessCasesPage({ params }: Props) {
  const supabase = createClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, store_name, industry')
    .eq('id', params.storeId)
    .single()

  if (!store) notFound()

  // åæ¥­ç¨®ã®æåäºä¾ãåå¾ï¼ããããåªåï¼
  // industry ã¯ãã­ã¹ãåãªã®ã§ãindustry_id ã¸ã®ãããã³ã°ãå¿è¦
  // ããã§ã¯å¨ä»¶ãåå¾ãã¦ã¯ã©ã¤ã¢ã³ãå´ã§ãã£ã«ã¿ã¼å¯è½ã«ãã
  const { data: cases } = await supabase
    .from('success_cases')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('view_count', { ascending: false })

  const totalCases = cases?.length ?? 0
  const featuredCases = cases?.filter(c => c.is_featured) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">æåäºä¾ã©ã¤ãã©ãª</h1>
            <p className="text-sm text-indigo-200">ä»åºèã®æåäºä¾ãããã³ããå¾ã¾ããã</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-2xl font-bold">{totalCases}</p>
            <p className="text-xs text-indigo-200 mt-0.5">èç©ãããæåäºä¾</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-2xl font-bold">{featuredCases.length}</p>
            <p className="text-xs text-indigo-200 mt-0.5">ãã¼ããã¼å³é¸ã®ãããã</p>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
        <p className="text-sm font-bold text-amber-800 mb-2">ð¡ æ´»ç¨ã®ã³ã</p>
        <ul className="space-y-1 text-xs text-amber-700">
          <li>â¢ ãã¯ã¼ãã³ãäºä¾ï¼LINEç»é²çãä½ãã¨ãã¯ãããåèã«æè¨ãå¤ãã¦ã¿ã¾ããã</li>
          <li>â¢ ãåºåæãäºä¾ï¼åºåã®ã¯ãªãã¯çãä½ãå ´åãå®ç¸¾ã®ããè¨´æ±æã«åãæ¿ããã ãã§æ¹åãããã¨ãããã¾ã</li>
          <li>â¢ ãLPãäºä¾ï¼ã­ã£ããã³ãã¼ãã¡ãã¥ã¼æ²è¼é ãå¤ããã ãã§åå¿ãå¤ããã¾ã</li>
        </ul>
      </div>

      {/* Cases */}
      <SuccessCasesClient cases={cases ?? []} storeName={store.store_name} />
    </div>
  )
}
