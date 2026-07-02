import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Users, ArrowUpRight, Shield, Store } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function AdminUsersPage() {
  const supabase = createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: storeUsers } = await supabase
    .from('store_users')
    .select('*, stores(store_name)')

  // ユーザーごとの店舗リストをMap化
  const userStoresMap = new Map<string, string[]>()
  ;(storeUsers ?? []).forEach(su => {
    const list = userStoresMap.get(su.user_id) ?? []
    list.push((su.stores as any)?.store_name ?? '—')
    userStoresMap.set(su.user_id, list)
  })

  const admins = profiles?.filter(p => p.role === 'admin') ?? []
  const owners = profiles?.filter(p => p.role === 'owner') ?? []
  const staffs = profiles?.filter(p => p.role === 'staff') ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-muted-foreground text-sm mt-1">計{profiles?.length ?? 0}ユーザー</p>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '管理者', count: admins.length, icon: Shield, color: 'bg-purple-100 text-purple-600' },
          { label: '店舗オーナー', count: owners.length, icon: Store, color: 'bg-blue-100 text-blue-600' },
          { label: 'スタッフ', count: staffs.length, icon: Users, color: 'bg-green-100 text-green-600' },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ユーザー一覧 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">全ユーザー一覧</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">名前</th>
                <th className="pb-3 pr-4 font-medium">メール</th>
                <th className="pb-3 pr-4 font-medium">ロール</th>
                <th className="pb-3 pr-4 font-medium">担当店舗</th>
                <th className="pb-3 font-medium">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {profiles?.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4 font-medium">{p.name || '—'}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{p.email}</td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={p.role === 'admin' ? 'default' : p.role === 'owner' ? 'info' : 'secondary'}
                      className="text-xs"
                    >
                      {p.role === 'admin' ? '管理者' : p.role === 'owner' ? 'オーナー' : 'スタッフ'}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {(userStoresMap.get(p.id) ?? []).slice(0, 2).map((name, i) => (
                        <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">{name}</span>
                      ))}
                      {(userStoresMap.get(p.id) ?? []).length > 2 && (
                        <span className="text-xs text-muted-foreground">+{(userStoresMap.get(p.id) ?? []).length - 2}</span>
                      )}
                      {p.role === 'admin' && <span className="text-xs text-muted-foreground">全店舗</span>}
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground text-xs">
                    {format(new Date(p.created_at), 'yyyy/MM/dd', { locale: ja })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
