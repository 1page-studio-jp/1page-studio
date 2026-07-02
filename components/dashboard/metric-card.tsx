import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  subLabel?: string
  icon?: LucideIcon
  iconColor?: string   // Tailwind text color class e.g. 'text-blue-500'
  iconBg?: string      // Tailwind bg color class e.g. 'bg-blue-50'
  trend?: 'up' | 'down'
  trendLabel?: string
  accent?: boolean     // primary accent border
  size?: 'default' | 'lg'
}

export function MetricCard({
  label,
  value,
  subLabel,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
  trendLabel,
  accent = false,
  size = 'default',
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl bg-card border transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        accent
          ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/0 shadow-sm shadow-primary/10'
          : 'border-border hover:border-border/80',
        size === 'lg' ? 'p-6' : 'p-5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium text-muted-foreground truncate',
            size === 'lg' ? 'text-sm' : 'text-xs'
          )}>
            {label}
          </p>
          <p className={cn(
            'font-bold tracking-tight mt-1 leading-none',
            size === 'lg' ? 'text-3xl' : 'text-2xl',
            accent && 'text-primary'
          )}>
            {value}
          </p>
          {subLabel && (
            <p className="text-xs text-muted-foreground mt-1.5">{subLabel}</p>
          )}
          {trend && trendLabel && (
            <div className={cn(
              'mt-2 flex items-center gap-1 text-xs font-medium',
              trend === 'up' ? 'text-emerald-600' : 'text-red-500'
            )}>
              {trend === 'up'
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />
              }
              <span>{trendLabel}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
            iconBg
          )}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  )
}
