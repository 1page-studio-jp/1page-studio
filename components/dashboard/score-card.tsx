import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'

export interface ScoreItem {
  label: string
  done: boolean
  partial?: boolean   // 設定済みだが改善余地あり
  note?: string       // 「設定済み」「未設定」など
}

interface ScoreCardProps {
  score: number
  items: ScoreItem[]
  month?: string
}

function getLevel(score: number) {
  if (score >= 90) return { label: '最高の状態', color: '#059669', trackColor: '#d1fae5' }
  if (score >= 70) return { label: '好調', color: '#0284c7', trackColor: '#dbeafe' }
  if (score >= 50) return { label: 'もう少し', color: '#d97706', trackColor: '#fef3c7' }
  return { label: '要改善', color: '#dc2626', trackColor: '#fee2e2' }
}

export function ScoreCard({ score, items, month }: ScoreCardProps) {
  const level = getLevel(score)
  const clamped = Math.max(0, Math.min(100, score))
  const nextTarget = clamped < 90 ? 90 : 100
  const gap = nextTarget - clamped

  const radius = 54
  const circ = 2 * Math.PI * radius
  const offset = circ - (clamped / 100) * circ

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
      {/* Title */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">お店の成長スコア</p>
          {month && <p className="text-xs text-gray-300 mt-0.5">{month}の評価</p>}
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ color: level.color, background: level.trackColor }}
        >
          {level.label}
        </span>
      </div>

      <div className="flex items-start gap-6">
        {/* Circle */}
        <div className="relative shrink-0">
          <svg width="128" height="128">
            <circle cx="64" cy="64" r={radius}
              fill="none" strokeWidth="10"
              stroke={level.trackColor}
              transform="rotate(-90 64 64)"
            />
            <circle cx="64" cy="64" r={radius}
              fill="none" strokeWidth="10"
              stroke={level.color}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black leading-none" style={{ color: level.color }}>{clamped}</span>
            <span className="text-xs text-gray-400 mt-1">点</span>
          </div>
        </div>

        {/* Info + gap message */}
        <div className="flex-1 min-w-0 pt-1">
          {gap > 0 ? (
            <div
              className="rounded-2xl px-4 py-3 mb-4"
              style={{ background: level.trackColor }}
            >
              <p className="text-sm font-bold leading-snug" style={{ color: level.color }}>
                あと {gap}点で{nextTarget}点！
              </p>
              <p className="text-xs mt-0.5 opacity-80" style={{ color: level.color }}>
                下のチェックリストを確認してください
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 mb-4">
              <p className="text-sm font-bold text-emerald-700">満点達成！🎉</p>
              <p className="text-xs text-emerald-500 mt-0.5">この調子で維持しましょう</p>
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : item.partial ? (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-gray-200" />
                )}
                <span className={`text-xs leading-snug ${item.done ? 'text-gray-400' : item.partial ? 'text-gray-600 font-medium' : 'text-gray-500'}`}>
                  {item.label}
                </span>
                {item.note && (
                  <span className={`ml-auto text-[10px] shrink-0 ${item.done ? 'text-emerald-500' : item.partial ? 'text-amber-500' : 'text-gray-300'}`}>
                    {item.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
