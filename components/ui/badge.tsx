import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-gray-900 text-white',
        secondary:   'bg-gray-100 text-gray-600',
        destructive: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-100',
        outline:     'border border-gray-200 text-gray-700 bg-white',
        success:     'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
        warning:     'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
        info:        'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100',
        primary:     'bg-indigo-600 text-white shadow-sm shadow-indigo-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
