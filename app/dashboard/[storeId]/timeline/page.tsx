import { createClient } from '@/lib/supabase/server'
import { format, isSameMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  FileText, MessageSquare, Tag, TrendingUp,
  Star, Megaphone, Users, Zap,
} from 'lucide-react'

// カテゴリ別の設定
const CATEGORY_CONFIG: Record<string, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  dot: string
}> = {
  lp:      { label: 'LP',         icon: FileText,     iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    dot: 'bg-blue-400' },
  line:    { label: 'LINE',       icon: Users,        iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', dot: 'bg-emerald-400' },
  ad:      { label: '広告',       icon: Megaphone,    iconBg: 'bg-violet-50',  iconColor: 'text-violet-500',  dot: 'bg-violet-400' },
  coupon:  { label: 'クーポン',   icon: Tag,          iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   dot: 'bg-amber-400' },
  google:  { label: 'Google',     icon: Star,         iconBg: 'bg-orange-50',  iconColor: 'text-orange-500',  dot: 'bg-orange-400' },
  inquiry: { label: '問い合わせ', icon: MessageSquare,iconBg: 'bg-pink-50',    iconColor: 'text-pink-500',    dot: 'bg-pink-400' },
  revenue: { label: '売上',       icon: TrendingUp,   iconBg: 'bg-teal-50',    iconColor: 'text-teal-500',    dot: 'bg-teal-400' },
  other:   { label: 'その他',     icon: Zap,          iconBg: 'bg-gray-50',    iconColor: 'text-gray-400',    dot: 'bg-gray-300' },
}

type Milestone = {
  id: string
  title: string
  description: string | null
  category: string
  happened_at: string
  metric_label: string | null
  metric_value: string | null
  metric_up: boolean
  is_auto: boolean
}

// 月ごとにグルーピング
function groupByMonth(milestones: Milestone[]) {
  const map = new Map<string, Milestone[]>()
  for (const m of milestones) {
    const key = format(new Date(m.happened_at), 'yyyy年M月', { locale: ja })
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return map
}

export default async function TimelinePage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()

  const { data: milestones } = await supabase
    .from('store_milestones')
    .select('*')
    .eq('store_id', params.storeId)
    .is('deleted_at', null)
    .order('happened_at', { ascending: false })

  const grouped = groupByMonth(milestones ?? [])

  return (
    <div className="min-h-full bg-[#FAFAFA]">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 pb-28 md:pb-10">

        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-[28px] font-black tracking-tight text-gray-900">改善の記録</h1>
          <p className="text-[15px] text-gray-400 mt-1">
            あなたのお店がどう成長してきたか、一目で確認できます
          </p>
        </div>

        {/* 空状態 */}
        {grouped.size === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
              <Zap className="h-7 w-7 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-400">まだ記録がありません</p>
            <p className="text-sm text-gray-300 mt-1">担当パートナーが活動を記録していきます</p>
          </div>
        )}

        {/* タイムライン */}
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([month, items]) => (
            <div key={month}>
              {/* 月ラベル */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[13px] font-bold text-gray-900 uppercase tracking-widest">{month}</span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[11px] text-gray-300">{items.length}件</span>
              </div>

              {/* エントリーリスト */}
              <div className="relative">
                {/* 縦線 */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-100" />

                <div className="space-y-1">
                  {items.map((m, i) => {
                    const cfg = CATEGORY_CONFIG[m.category] ?? CATEGORY_CONFIG.other
                    const Icon = cfg.icon
                    const date = new Date(m.happened_at)

                    return (
                      <div key={m.id} className="relative flex gap-4 items-start pl-1 group">
                        {/* ドット */}
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                          <div className={`h-3 w-3 rounded-full ${cfg.dot} ring-2 ring-white`} />
                        </div>

                        {/* カード */}
                        <div className="flex-1 min-w-0 mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
                                <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-snug">{m.title}</p>
                                {m.description && (
                                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{m.description}</p>
                                )}
                              </div>
                            </div>

                            {/* 数値インパクト */}
                            {m.metric_value && (
                              <span className={`shrink-0 text-sm font-bold px-2.5 py-1 rounded-full ${
                                m.metric_up
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-600'
                              }`}>
                                {m.metric_value}
                              </span>
                            )}
                          </div>

                          {/* フッター */}
                          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-50">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.iconBg} ${cfg.iconColor}`}>
                              {cfg.label}
                            </span>
                            <span className="text-[11px] text-gray-300">
                              {format(date, 'M月d日（E）', { locale: ja })}
                            </span>
                            {m.is_auto && (
                              <span className="ml-auto text-[10px] text-gray-200">自動記録</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 末尾メッセージ */}
        {grouped.size > 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 py-6 text-center">
            <div className="h-3 w-3 rounded-full bg-gray-200" />
            <p className="text-xs text-gray-300">ここからスタートしました</p>
          </div>
        )}

      </div>
    </div>
  )
}
