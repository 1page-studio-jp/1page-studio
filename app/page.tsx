import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin')

  const { data: storeUser } = await supabase
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (storeUser) redirect(`/dashboard/${storeUser.store_id}`)

  redirect('/login')
}
