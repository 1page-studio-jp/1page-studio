'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Tag, MessageSquare,
  Settings, LogOut, BarChart3, Store, ChevronDown, Wifi, Clock, Activity, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Store as StoreType } from '@/types'

interface SidebarProps {
  storeId: string
  storeName: string
  userStores: StoreType[]
}

const navItems = (storeId: string) => [
  { href: `/dashboard/${storeId}`, label: 'ホーム', icon: LayoutDashboard },
  { href: `/dashboard/${storeId}/lp`, label: 'LP 管理', icon: FileText },
  { href: `/dashboard/${storeId}/coupons`, label: 'クーポン', icon: Tag },
  { href: `/dashboard/${storeId}/inquiries`, label: '問い合わせ', icon: MessageSquare },
  { href: `/dashboard/${storeId}/timeline`, label: '改善の記録', icon: Clock },
  { href: `/dashboard/${storeId}/funnel`, label: '集客ファネル', icon: Activity },
  { href: `/dashboard/${storeId}/reports`, label: '数字を見る', icon: BarChart3 },
  { href: `/dashboard/${storeId}/success-cases`, label: '成功事例', icon: BookOpen },
  { href: `/dashboard/${storeId}/integrations`, label: '外部サービス連携', icon: Wifi },
  { href: `/dashboard/${storeId}/settings`, label: '店舗設定', icon: Settings },
]

export function Sidebar({ storeId, storeName, userStores }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [storeOpen, setStoreOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b">
        <span className="text-lg font-bold tracking-tight">1Page Studio</span>
      </div>

      {/* Store Switcher */}
      {userStores.length > 1 && (
        <div className="px-4 py-3 border-b">
          <button
            onClick={() => setStoreOpen(!storeOpen)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{storeName}</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', storeOpen && 'rotate-180')} />
          </button>
          {storeOpen && (
            <div className="mt-1 space-y-1">
              {userStores.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/${s.id}`}
                  onClick={() => setStoreOpen(false)}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm hover:bg-accent truncate',
                    s.id === storeId && 'bg-accent font-medium'
                  )}
                >
                  {s.store_name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems(storeId).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </div>
  )
}
