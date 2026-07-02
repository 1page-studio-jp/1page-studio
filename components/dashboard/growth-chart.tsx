'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GrowthDataPoint {
  month: string        // "6月", "7月", etc.
  value: number
  isCurrentMonth?: boolean
}

export interface GrowthMetric {
  label: string        // "LINE登録", "問い合わせ", etc.
  unit: string         // "件", "円", "回", etc.
  data: GrowthDataPoint[]
  color?: string       // hex or tailwind variable
}

interface GrowthChartProps {
  metrics: GrowthMetric[]
  className?: string
}

// Visual block bar (■■■■■■) — shows prev vs current
interface BlockBarProps {
  prevValue: number
  currValue: number
  maxValue: number
  unit: string
  label: string
}

function BlockBar({ prevValue, currValue, maxValue, unit, label }: BlockBarProps) {
  const blocks = 10
  const prevBlocks = maxValue > 0 ? Math.round((prevValue / maxValue) * blocks) : 0
  const currBlocks = maxValue > 0 ? Math.round((currValue / maxValue) * blocks) : 0
  const diff = currValue - prevValue
  const pct = prevValue > 0 ? Math.round((diff / prevValue) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn(
          'flex items-center gap-0.5 text-xs font-bold',
          diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {diff > 0 ? '+' : ''}{diff}{unit}（{diff > 0 ? '+' : ''}{pct}%）
        </span>
      </div>
      {/* Previous month */}
      <div className="flex items-center gap-2">
        <span className="w-8 text-right text-[10px] text-muted-foreground shrink-0">先月</span>
        <div className="flex gap-0.5">
          {Array.from({ length: blocks }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-3 rounded-sm transition-all',
                i < prevBlocks ? 'bg-slate-300' : 'bg-slate-100'
              )}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{prevValue.toLocaleString()}{unit}</span>
      </div>
      {/* Current month */}
      <div className="flex items-center gap-2">
        <span className="w-8 text-right text-[10px] font-semibold text-indigo-700 shrink-0">今月</span>
        <div className="flex gap-0.5">
          {Array.from({ length: blocks }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 w-3 rounded-sm transition-all',
                i < currBlocks ? 'bg-indigo-500' : 'bg-indigo-100'
              )}
            />
          ))}
        </div>
        <span className="text-xs font-semibold text-indigo-700">{currValue.toLocaleString()}{unit}</span>
      </div>
    </div>
  )
}

// Custom tooltip
function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border bg-white shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.value?.toLocaleString()}{unit}
        </p>
      ))}
    </div>
  )
}

export function GrowthChart({ metrics, className }: GrowthChartProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {metrics.map((metric, mi) => {
        const data = metric.data
        const maxValue = Math.max(...data.map(d => d.value), 1)
        const currentIdx = data.findIndex(d => d.isCurrentMonth)
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : data.length - 2
        const currVal = data[currentIdx >= 0 ? currentIdx : data.length - 1]?.value ?? 0
        const prevVal = data[prevIdx >= 0 ? prevIdx : 0]?.value ?? 0
        const color = metric.color || '#6366f1'

        return (
          <div key={mi} className="space-y-4">
            {/* Block bar comparison */}
            <BlockBar
              label={metric.label}
              prevValue={prevVal}
              currValue={currVal}
              maxValue={maxValue}
              unit={metric.unit}
            />

            {/* Trend chart (6 months) */}
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip unit={metric.unit} />}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {data.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isCurrentMonth ? color : '#e2e8f0'}
                        opacity={entry.isCurrentMonth ? 1 : 0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {mi < metrics.length - 1 && <div className="border-t" />}
          </div>
        )
      })}
    </div>
  )
}

// Compact block-only version for dashboard (no chart)
interface GrowthBlocksProps {
  label: string
  prevValue: number
  currValue: number
  unit: string
  className?: string
}

export function GrowthBlocks({ label, prevValue, currValue, unit, className }: GrowthBlocksProps) {
  const maxValue = Math.max(prevValue, currValue, 1)
  return (
    <div className={cn('', className)}>
      <BlockBar
        label={label}
        prevValue={prevValue}
        currValue={currValue}
        maxValue={maxValue}
        unit={unit}
      />
    </div>
  )
}
