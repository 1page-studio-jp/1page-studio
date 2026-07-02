import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Settings, Globe, Bell, Shield, Database, Zap,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'

export default async function AdminSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  // System stats
  const [{ count: storeCount }, { count: userCount }, { count: lpCount }] = await Promise.all([
    supabase.from('stores').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('lp_pages').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])

  const platformStatuses = [
    { name: 'Google 広告', key: 'google_ads', status: 'planned', description: 'Google Ads API v17' },
    { name: 'Google ビジネスプロフィール', key: 'google_business', status: 'planned', description: 'My Business API v4.9' },
    { name: 'Meta 広告', key: 'meta_ads', status: 'planned', description: 'Marketing API v19' },
    { name: 'LINE 公式アカウント', key: 'line_official', status: 'planned', description: 'Messaging API v2' },
    { name: 'Google Analytics', key: 'google_analytics', status: 'planned', description: 'GA4 Data API v1' },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">システム設定</h1>
        <p className="text-muted-foreground mt-1">プラットフォーム全体の設定・API連携状況・システム情報</p>
      </div>

      {/* System Info */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Database className="h-4 w-4" /> システム情報
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '登録店舗数', value: storeCount ?? 0, unit: '店舗' },
            { label: '登録ユーザー数', value: userCount ?? 0, unit: 'ユーザー' },
            { label: 'LP総数', value: lpCount ?? 0, unit: 'ページ' },
          ].map(({ label, value, unit }) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{value}<span className="text-base font-normal text-muted-foreground ml-1">{unit}</span></p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Platform API Connections */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4" /> 外部API連携ステータス
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {platformStatuses.map(({ name, key, status, description }) => (
                <div key={key} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-medium text-sm">{name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs gap-1.5">
                    <Clock className="h-3 w-3" />
                    実装予定
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-3">
          ※ 各API連携は将来のバージョンで順次実装予定です。店舗側の「外部連携」ページからOAuth認証フローを提供します。
        </p>
      </section>

      {/* AI Settings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4" /> AI設定
        </h2>
        <Card>
          <CardContent className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-sm">使用モデル</p>
                <p className="text-xs text-muted-foreground mt-0.5">AIコメント・LP生成に使用するOpenAIモデル</p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">gpt-4o-mini</Badge>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-sm">AIコメント承認フロー</p>
                <p className="text-xs text-muted-foreground mt-0.5">生成後、管理者承認後に店舗オーナーへ表示</p>
              </div>
              <Badge variant="success" className="text-xs gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                有効
              </Badge>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-sm">LP AIアシスト</p>
                <p className="text-xs text-muted-foreground mt-0.5">LP作成時のキャッチコピー・説明文AI生成</p>
              </div>
              <Badge variant="success" className="text-xs gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                有効
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Security */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4" /> セキュリティ
        </h2>
        <Card>
          <CardContent className="divide-y p-0">
            {[
              { label: 'Row Level Security (RLS)', desc: 'Supabase RLSによるマルチテナント分離', enabled: true },
              { label: 'JWT認証', desc: 'Supabase Authによるセッション管理', enabled: true },
              { label: '論理削除', desc: '店舗・LP・クーポンはソフトデリート', enabled: true },
              { label: '操作ログ', desc: '管理者操作はactivity_logsに記録', enabled: true },
            ].map(({ label, desc, enabled }) => (
              <div key={label} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {enabled ? (
                  <Badge variant="success" className="text-xs gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    有効
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-xs gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    無効
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Multi-tenant Architecture Info */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4" /> マルチテナント設計
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">データ分離ポリシー</CardTitle>
            <CardDescription>1Page Studio のマルチテナント分離の仕組み</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="font-medium">テナント分離レベル</p>
              <ul className="space-y-1.5 text-muted-foreground text-xs">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  <span><strong className="text-foreground">DBレベル:</strong> すべてのテーブルに store_id カラム + RLS ポリシーで自動フィルタ</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  <span><strong className="text-foreground">APIレベル:</strong> can_access_store() 関数で store_id を毎リクエスト検証</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  <span><strong className="text-foreground">ミドルウェア:</strong> /dashboard/[storeId] へのアクセスをロール別にルーティング</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  <span><strong className="text-foreground">公開LP:</strong> /lp/[slug] は認証不要・published ステータスのみ公開</span>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="font-medium">スケーラビリティ</p>
              <p className="text-xs text-muted-foreground">
                現設計で数百〜数千店舗を単一DBで管理可能。将来的に必要に応じて Supabase の
                read replicas または DB sharding へ移行できる構造になっています。
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
