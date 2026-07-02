import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'

export default async function AdminStoresPage() {
  const supabase = createClient()
  const { data: stores } = await supabase
    .from('stores')
    .select('*, profiles!stores_owner_id_fkey(name, email)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">店舗管理</h1>
          <p className="text-muted-foreground mt-1">{stores?.length ?? 0}店舗</p>
        </div>
        <Link href="/admin/stores/new">
          <Button>
            <Plus className="h-4 w-4 mr-1" />
            新規店舗追加
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-6 py-4 font-medium text-muted-foreground">店舗名</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">業種</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">オーナー</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">ステータス</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">登録日</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stores?.map(store => (
                  <tr key={store.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{store.store_name}</p>
                        <p className="text-xs text-muted-foreground">{store.phone_number ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{store.industry || '—'}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm">{(store.profiles as any)?.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{(store.profiles as any)?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          store.status === 'active' ? 'success' :
                          store.status === 'trial' ? 'warning' :
                          store.status === 'inactive' ? 'secondary' : 'destructive'
                        }
                      >
                        {store.status === 'active' ? '稼働中' :
                         store.status === 'trial' ? 'トライアル' :
                         store.status === 'inactive' ? '停止中' : '解約'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(store.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <Link href={`/admin/stores/${store.id}`} className="text-primary text-xs hover:underline">
                          編集
                        </Link>
                        <Link href={`/dashboard/${store.id}`} className="text-muted-foreground text-xs hover:underline">
                          ダッシュボード
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!stores || stores.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <Store className="mx-auto h-8 w-8 mb-3 opacity-40" />
                      <p>店舗が登録されていません</p>
                      <Link href="/admin/stores/new" className="mt-2 inline-block text-sm text-primary hover:underline">
                        最初の店舗を追加する
                      </Link>
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

function Store({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} points="9,22 9,12 15,12 15,22" />
    </svg>
  )
}
