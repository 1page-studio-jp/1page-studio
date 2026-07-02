'use client'

import { cn } from '@/lib/utils'
import {
  MousePointerClick, FileText, Users, Tag, Store,
  AlertTriangle, TrendingDown, TrendingUp, ArrowRight,
  Lightbulb, ChevronRight,
} from 'lucide-react'

export interface FunnelStep {
  id: 'ad_clicks' | 'lp_views' | 'line_adds' | 'coupon_gets' | 'visits'
  label: string
  sublabel: string
  value: number
  icon: React.ElementType
  color: string        // tailwind bg class
  textColor: string    // tailwind text class
  borderColor: string  // tailwind border class
}

export interface FunnelData {
  steps: FunnelStep[]
  period: string       // e.g. "7月"
}

interface StepConversion {
  step: FunnelStep
  nextStep: FunnelStep | null
  rate: number | null        // conversion to next step (0–100)
  isBottleneck: boolean
  isGood: boolean
}

// Advice per bottleneck step
const BOTTLENECK_ADVICE: Record<string, { title: string; actions: string[] }> = {
  lp_views: {
    title: 'LP への流入が少ない',
    actions: [
      '広告のターゲット設定を「渋谷 縮毛矯正」などローカルキーワードに絞り込む',
      '広告の画像をビフォーアフター写真に変更する',
      'Googleマップのプロフィールにウェブサイト（LP）リンクを追加する',
    ],
  },
  line_adds: {
    title: 'LPを見てもLINEに登録してもらえていない',
    actions: [
      'LP上部にLINE登録ボタンを大きく目立つように配置する',
      '「登録するとクーポンがもらえる」特典を明示する',
      'LP のキャッチコピーをお客様の悩み（例: 縮毛が長持ちしない）に合わせる',
    ],
  },
  coupon_gets: {
    title: 'LINE登録後にクーポンを使ってもらえていない',
    actions: [
      'LINE登録直後に自動でクーポンを配信するメッセージを設定する',
      'クーポンの有効期限を短く設定して「今すぐ使いたい」気持ちにする',
      '週1回、クーポンのリマインド配信を送る',
    ],
  },
  visits: {
    title: 'クーポン取得後に来店につながっていない',
    actions: [
      'クーポン有効期限の3日前にLINEでリマインドを送る',
      '「次回予約特典」を追加してリピートを促す',
      '「友人紹介キャンペーン」でクーポン共有を促す',
    ],
  },
}

const GOOD_RATE = 30  // conversion rate above this is "good"
const WARN_RATE = 15  // below this is "bottleneck"

function calcConversions(steps: FunnelStep[]): StepConversion[] {
  return steps.map((step, i) => {
    const nextStep = steps[i + 1] ?? null
    const rate =
      nextStep && step.value > 0
        ? Math.round((nextStep.value / step.value) * 100)
        : null

    return {
      step,
      nextStep,
      rate,
      isBottleneck: rate !== null && rate < WARN_RATE,
      isGood: rate !== null && rate >= GOOD_RATE,
    }
  })
}

// Horizontal bar — width proportional to max value
function FunnelBar({
  value,
  maxValue,
  color,
  isBottleneck,
}: {
  value: number
  maxValue: number
  color: string
  isBottleneck: boolean
}) {
  const pct = maxValue > 0 ? Math.max(8, Math.round((value / maxValue) * 100)) : 8
  return (
    <div className="relative h-12 w-full overflow-hidden rounded-xl bg-slate-50">
      <div
        className={cn(
          'h-full rounded-xl transition-all duration-700',
          color,
          isBottleneck && 'ring-2 ring-orange-400 ring-offset-1',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Arrow + conversion rate between steps
function ConversionArrow({
  rate,
  isBottleneck,
  isGood,
}: {
  rate: number | null
  isBottleneck: boolean
  isGood: boolean
}) {
  if (rate === null) return null
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex-1 border-t border-dashed border-slate-200" />
      <div
        className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
          isBottleneck
            ? 'bg-orange-100 text-orange-700'
            : isGood
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-100 text-slate-600',
        )}
      >
        {isBottleneck ? (
          <TrendingDown className="h-3 w-3" />
        ) : isGood ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <ArrowRight className="h-3 w-3" />
        )}
        {rate}%
      </div>
      <div className="flex-1 border-t border-dashed border-slate-200" />
    </div>
  )
}

interface FunnelChartProps {
  data: FunnelData
  className?: string
}

export function FunnelChart({ data, className }: FunnelChartProps) {
  const conversions = calcConversions(data.steps)
  const maxValue = Math.max(...data.steps.map(s => s.value), 1)

  // Find worst bottleneck (lowest rate, excluding null)
  const bottleneckStep = conversions
    .filter(c => c.rate !== null && c.isBottleneck)
    .sort((a, b) => (a.rate ?? 99) - (b.rate ?? 99))[0] ?? null

  // Even if no step is technically below threshold, find the worst
  const worstStep =
    bottleneckStep ??
    conversions
      .filter(c => c.rate !== null)
      .sort((a, b) => (a.rate ?? 99) - (b.rate ?? 99))[0] ??
    null

  const advice = worstStep ? BOTTLENECK_ADVICE[worstStep.nextStep?.id ?? ''] : null

  return (
    <div className={cn('space-y-1', className)}>
      {conversions.map(({ step, nextStep, rate, isBottleneck, isGood }, i) => {
        const Icon = step.icon
        return (
          <div key={step.id}>
            {/* Step card */}
            <div
              className={cn(
                'rounded-2xl border bg-white p-4 transition-all',
                isBottleneck && nextStep
                  ? 'border-orange-200 shadow-sm shadow-orange-50'
                  : 'border-slate-100',
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                {/* Step number */}
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    step.color,
                  )}
                >
                  {i + 1}
                </div>
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    step.color.replace('bg-', 'bg-').replace('-500', '-50').replace('-600', '-50'),
                  )}
                >
                  <Icon className={cn('h-4 w-4', step.textColor)} />
                </div>
                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                  <p className="text-[11px] text-muted-foreground">{step.sublabel}</p>
                </div>
                {/* Value */}
                <div className="text-right shrink-0">
                  <p className={cn('text-2xl font-black tabular-nums', step.textColor)}>
                    {step.value.toLocaleString()}
                  </p>
                  {/* Bottleneck badge */}
                  {isBottleneck && nextStep && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      要改善
                    </span>
                  )}
                </div>
              </div>

              {/* Bar */}
              <FunnelBar
                value={step.value}
                maxValue={maxValue}
                color={step.color}
                isBottleneck={isBottleneck && !!nextStep}
              />
            </div>

            {/* Conversion arrow */}
            {nextStep && (
              <ConversionArrow rate={rate} isBottleneck={isBottleneck} isGood={isGood} />
            )}
          </div>
        )
      })}

      {/* Bottleneck advice card */}
      {worstStep && advice && (
        <div className="mt-4 rounded-2xl border-2 border-orange-200 bg-orange-50/60 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <Lightbulb className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-0.5">
                ボトルネック
              </p>
              <p className="text-sm font-bold text-orange-900">{advice.title}</p>
              <p className="text-xs text-orange-700 mt-0.5">
                {worstStep.step.label} → {worstStep.nextStep?.label} の転換率が
                <span className="font-bold"> {worstStep.rate}%</span> です
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {advice.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl bg-white/70 px-3 py-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm text-orange-900 leading-snug">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Default step definitions (values filled in at page level)
export function buildFunnelData(
  adClicks: number,
  lpViews: number,
  lineAdds: number,
  couponGets: number,
  visits: number,
  period: string,
): FunnelData {
  return {
    period,
    steps: [
      {
        id: 'ad_clicks',
        label: '広告クリック',
        sublabel: '広告を見てLPに来た人',
        value: adClicks,
        icon: MousePointerClick,
        color: 'bg-blue-500',
        textColor: 'text-blue-600',
        borderColor: 'border-blue-200',
      },
      {
        id: 'lp_views',
        label: 'LP閲覧',
        sublabel: 'ランディングページを見た人',
        value: lpViews,
        icon: FileText,
        color: 'bg-violet-500',
        textColor: 'text-violet-600',
        borderColor: 'border-violet-200',
      },
      {
        id: 'line_adds',
        label: 'LINE登録',
        sublabel: '友だち追加してくれた人',
        value: lineAdds,
        icon: Users,
        color: 'bg-emerald-500',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
      },
      {
        id: 'coupon_gets',
        label: 'クーポン取得',
        sublabel: 'クーポンを受け取った人',
        value: couponGets,
        icon: Tag,
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-200',
      },
      {
        id: 'visits',
        label: '来店',
        sublabel: '実際にご来店いただいた方',
        value: visits,
        icon: Store,
        color: 'bg-rose-500',
        textColor: 'text-rose-600',
        borderColor: 'border-rose-200',
      },
    ],
  }
}
