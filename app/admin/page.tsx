import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store, Users, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = createClient()

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: stores }, { count: userCount }] = await Promise.all([
    supabase.from('stores').select('*, subscriptions(plan_name, status)').is('deleted_at', null).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
  ])

  // LP停滞アラート: 各店舗の最新LP作成日を確認
  const storeIds = stores?.map(s => s.id) || []
  const lpAlerts: Array<{ storeId: string, storeName: string, slug: string, days: number | null }> = []
  if (storeIds.length > 0) {
    const { data: latestLps } = await supabase
      .from('lp_pages')
      .select('store_id, created_at')
      .in('store_id', storeIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    for (const store of (stores || [])) {
      if (store.status !== 'active') continue
      const storeLps = latestLps?.filter(l => l.store_id === store.id) || []
      if (storeLps.length === 0) {
        lpAlerts.push({ storeId: store.id, storeName: store.store_name, slug: store.slug, days: null })
      } else {
        const latest = storeLps[0]
        const days = Math.floor((Date.now() - new Date(latest.created_at).getTime()) / (24 * 60 * 60 * 1000))
        if (days >= 14) lpAlerts.push({ storeId: store.id, storeName: store.store_name, slug: store.slug, days })
      }
    }
    lpAlerts.sort((a, b) => (b.days || 999) - (a.days || 999))
  }

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

      {/* LP停滞アラート */}
      {lpAlerts.length > 0 && (
        <Card className='border-orange-200 bg-orange-50'>
          <CardHeader>
            <CardTitle className='text-base font-semibold text-orange-800 flex items-center gap-2'>
              <AlertCircle className='h-4 w-4' /> LP更新アラート ({lpAlerts.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-orange-600 mb-3'>以下の店舗は2週間以上LPが更新されていません。</p>
            <div className='space-y-2'>
              {lpAlerts.map(alert => (
                <div key={alert.storeId} className='flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-orange-100'>
                  <div>
                    <span className='text-sm font-medium text-gray-800'>{alert.storeName}</span>
                    <span className='ml-2 text-xs text-orange-500'>
                      {alert.days === null ? 'LP未作成' : `${alert.days}日更新なし`}
                    </span>
                  </div>
                  <Link
                    href={`/admin/stores/${alert.storeId}/lp/new`}
                    className='text-xs font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 px-3 py-1 rounded-full'
                  >
                    LP作成 →
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
