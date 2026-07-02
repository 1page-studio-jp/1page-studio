import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { storeId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // 管理者は全店舗にアクセス可能
  if (profile?.role !== 'admin') {
    const { data: storeUser } = await supabase
      .from('store_users')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', params.storeId)
      .single()

    if (!storeUser) redirect('/')
  }

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('id', params.storeId)
    .is('deleted_at', null)
    .single()

  if (!store) redirect('/')

  // 未対応の問い合わせ件数（モバイルナビのバッジ用）
  const { count: newInquiryCount } = await supabase
    .from('inquiries')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', params.storeId)
    .eq('status', 'new')

  // ユーザーの全店舗リスト（サイドバーの店舗切替用）
  const { data: storeUsers } = await supabase
    .from('store_users')
    .select('stores(*)')
    .eq('user_id', user.id)

  const userStores = storeUsers?.map(su => (su.stores as any)).filter(Boolean) ?? []

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar (PC) */}
      <div className="hidden md:flex">
        <Sidebar
          storeId={params.storeId}
          storeName={store.store_name}
          userStores={userStores}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav storeId={params.storeId} newInquiryCount={newInquiryCount ?? 0} />
    </div>
  )
}
