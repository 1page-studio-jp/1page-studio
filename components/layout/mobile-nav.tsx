'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Activity, Tag, MessageSquare, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  storeId: string
  newInquiryCount?: number
}

export function MobileNav({ storeId, newInquiryCount = 0 }: MobileNavProps) {
  const pathname = usePathname()
  const base = `/dashboard/${storeId}`

  const items = [
    { href: base, icon: LayoutDashboard, label: 'ホーム', exact: true },
    { href: `${base}/inquiries`, icon: MessageSquare, label: '問い合わせ', badge: newInquiryCount },
    { href: `${base}/funnel`, icon: Activity, label: 'ファネル' },
    { href: `${base}/timeline`, icon: Clock, label: '記録' },
    { href: `${base}/coupons`, icon: Tag, label: 'クーポン' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md border-t pointer-events-none" />
      <div className="relative flex items-stretch pb-safe">
        {items.map(({ href, icon: Icon, label, badge, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-all"
            >
              <div className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                active ? 'bg-primary/10' : ''
              )}>
                <Icon className={cn(
                  'h-5 w-5 transition-all',
                  active ? 'text-primary scale-110' : 'text-muted-foreground'
                )} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-0.5 text-[9px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none',
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
