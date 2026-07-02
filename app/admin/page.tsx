import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store, Users, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = createClient()

  const [{ data: stores }, { count: userCount }] = await Promise.all([
    supabase.from('stores').select('*, subscriptions(plan_name, status)').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
  ])

  const activeStores = stores?.filter(s => s.status === 'active').length ?? 0
  const trialStores = stores?.filter(s => s.status === 'trial').length ?? 0
  const totalStores = stores?.length ?? 0

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">管理者ダッシュボード</h1>
        <p className="text-muted-foreground mt-1">全店舗の状況を確認してください</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総店舗数</p>
                <p className="text-2xl font-bold">{totalStores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">稼働中</p>
                <p className="text-2xl font-bold">{activeStores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">トライアル</p>
                <p className="text-2xl font-bold">{trialStores}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ユーザー数</p>
                <p className="text-2xl font-bold">{userCount ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store List */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>店舗一覧</CardTitle>
          <Link href="/admin/stores/new" className="text-sm text-primary hover:underline">
            + 店舗を追加
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">店舗名</th>
                  <th className="pb-3 pr-4 font-medium">業種</th>
                  <th className="pb-3 pr-4 font-medium">プラン</th>
                  <th className="pb-3 pr-4 font-medium">ステータス</th>
                  <th className="pb-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stores?.map(store => (
                  <tr key={store.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 pr-4 font-medium">{store.store_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{store.industry || '未設定'}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">
                        {(store.subscriptions as any)?.[0]?.plan_name ?? 'trial'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          store.status === 'active' ? 'success' :
                          store.status === 'trial' ? 'warning' : 'secondary'
                        }
                      >
                        {store.status === 'active' ? '稼働中' :
                         store.status === 'trial' ? 'トライアル' :
                         store.status === 'inactive' ? '停止中' : '解約'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link href={`/admin/stores/${store.id}`} className="text-primary hover:underline text-xs">
                          詳細
                        </Link>
                        <Link href={`/dashboard/${store.id}`} className="text-muted-foreground hover:underline text-xs">
                          ダッシュボード
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!stores || stores.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      店舗が登録されていません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
