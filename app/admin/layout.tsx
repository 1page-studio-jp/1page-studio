import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Store, Users, BarChart3, Settings, LogOut, LayoutDashboard } from 'lucide-react'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-60 flex-col border-r bg-card shrink-0">
        <div className="flex h-16 items-center gap-2 px-6 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-sm">1Page Studio</span>
            <p className="text-[10px] text-muted-foreground">管理者パネル</p>
          </div>
        </div>

        {/* Nav (client component for active state) */}
        <AdminNav />

        <div className="p-3 border-t">
          <div className="px-3 py-1 text-xs text-muted-foreground truncate">{profile?.name || user.email}</div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-1">
              <LogOut className="h-4 w-4" />
              ログアウト
            </button>
          </form>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
