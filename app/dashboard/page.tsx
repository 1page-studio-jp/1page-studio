import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardIndexPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 管理者はadminへ
  const role = user.app_metadata?.role || user.user_metadata?.role
  if (role === 'admin') {
    redirect('/admin')
  }

  // オーナーは自分の店舗へ
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (store) {
    redirect('/dashboard/' + store.id)
  }

  // 店舗が見つからない場合はログインに戻す
  redirect('/login')
}
