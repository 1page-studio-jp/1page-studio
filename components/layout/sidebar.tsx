'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Tag, MessageSquare,
  Settings, LogOut, BarChart3, Store, ChevronDown,
  Wifi, Clock, Activity, BookOpen,
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

const navGroups = (storeId: string) => [
  {
    label: null,
    items: [
      { href: `/dashboard/${storeId}`, label: 'ホーム', icon: LayoutDashboard, exact: true },
      { href: `/dashboard/${storeId}/inquiries`, label: '問い合わせ', icon: MessageSquare },
    ],
  },
  {
    label: '集客ツール',
    items: [
      { href: `/dashboard/${storeId}/lp`, label: 'LP 管理', icon: FileText },
      { href: `/dashboard/${storeId}/coupons`, label: 'クーポン', icon: Tag },
      { href: `/dashboard/${storeId}/funnel`, label: '集客ファネル', icon: Activity },
      { href: `/dashboard/${storeId}/reports`, label: '数字を見る', icon: BarChart3 },
    ],
  },
  {
    label: '成長記録',
    items: [
      { href: `/dashboard/${storeId}/timeline`, label: '改善の記録', icon: Clock },
      { href: `/dashboard/${storeId}/success-cases`, label: '成功事例', icon: BookOpen },
    ],
  },
  {
    label: '設定',
    items: [
      { href: `/dashboard/${storeId}/integrations`, label: '外部サービス連携', icon: Wifi },
      { href: `/dashboard/${storeId}/settings`, label: '店舗設定', icon: Settings },
    ],
  },
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
    <div className="flex h-full w-[220px] flex-col bg-white border-r border-gray-100/80">

      {/* ── ロゴ ── */}
      <div className="flex h-[60px] items-center gap-3 px-4 border-b border-gray-100/80">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-indigo-600 text-white text-[11px] font-black tracking-tight shadow-sm shadow-indigo-300/50 shrink-0">
          1P
        </div>
        <span className="text-[14px] font-bold tracking-tight text-gray-900">1Page Studio</span>
      </div>

      {/* ── 店舗切替 ── */}
      {userStores.length > 1 && (
        <div className="px-3 py-2 border-b border-gray-100/80">
          <button
            onClick={() => setStoreOpen(!storeOpen)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-[12px] hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Store className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate font-medium text-gray-700">{storeName}</span>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform duration-200', storeOpen && 'rotate-180')} />
          </button>
          {storeOpen && (
            <div className="mt-1 space-y-0.5">
              {userStores.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/${s.id}`}
                  onClick={() => setStoreOpen(false)}
                  className={cn(
                    'block rounded-lg px-3 py-1.5 text-[12px] hover:bg-gray-50 truncate text-gray-500 transition-colors',
                    s.id === storeId && 'bg-indigo-50 text-indigo-700 font-semibold'
                  )}
                >
                  {s.store_name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ナビ ── */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
        {navGroups(storeId).map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150',
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    )}
                  >
                    <Icon className={cn('h-[15px] w-[15px] shrink-0 transition-colors', active ? 'text-indigo-600' : 'text-gray-400')} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── ログアウト ── */}
      <div className="p-3 border-t border-gray-100/80">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
        >
          <LogOut className="h-[15px] w-[15px] shrink-0" />
          ログアウト
        </button>
      </div>
    </div>
  )
}
