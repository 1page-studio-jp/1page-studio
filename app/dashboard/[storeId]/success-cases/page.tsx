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

  // 同業種の成功事例を取得（ファジー優先）
  // industry はテキスト型なので、industry_id へのマッピングが必要
  // ここでは全件を取得してクライアント側でフィルター可能にする
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
            <h1 className="text-xl font-bold">成功事例ライブラリ</h1>
            <p className="text-sm text-indigo-200">他店舗の成功事例からヒントを掴みましょう。</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-2xl font-bold">{totalCases}</p>
            <p className="text-xs text-indigo-200 mt-0.5">蓄積された成功事例</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-2xl font-bold">{featuredCases.length}</p>
            <p className="text-xs text-indigo-200 mt-0.5">パートナー厳選のヒント</p>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
        <p className="text-sm font-bold text-amber-800 mb-2">💡 活用のコツ</p>
        <ul className="space-y-1 text-xs text-amber-700">
          <li>• 「クーポン」事例：LINE登録率を上げたいときは、これらを参考に文言を変えてみましょう。</li>
          <li>• 「広告費」事例：広告のクリック率が低い場合、実績のある訴求文に切り替えるだけで改善することがあります</li>
          <li>• 「LP」事例：キャッチコピーやメニュー掲載順を変えるだけで反応が変わります</li>
        </ul>
      </div>

      {/* Cases */}
      <SuccessCasesClient cases={cases ?? []} storeName={store.store_name} />
    </div>
  )
}
