import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, WifiOff, AlertTriangle, Clock, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const PLATFORMS = [
  {
    key: 'google_ads',
    label: 'Google広告',
    icon: '🔵',
    description: '広告費・クリック数・CPA・ROASを自動取得',
    docsUrl: 'https://developers.google.com/google-ads/api/docs/start',
    status_note: 'Google Ads APIでOAuth連携後、自動同期',
  },
  {
    key: 'google_business_profile',
    label: 'Googleビジネスプロフィール',
    icon: '🗺️',
    description: '検索表示・電話タップ・ルート検索・口コミ数を自動取得',
    docsUrl: 'https://developers.google.com/my-business/reference/rest',
    status_note: 'Business Profile APIでOAuth連携後、日次同期',
  },
  {
    key: 'meta_ads',
    label: 'Meta広告（Facebook / Instagram）',
    icon: '🔷',
    description: '広告費・インプレッション・クリック・CPAを自動取得',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api',
    status_note: 'Meta Marketing APIでOAuth連携後、自動同期',
  },
  {
    key: 'line_official',
    label: 'LINE公式アカウント',
    icon: '🟢',
    description: '友達追加数・メッセージ開封率・クーポン利用を自動取得',
    docsUrl: 'https://developers.line.biz/ja/docs/messaging-api/',
    status_note: 'LINE Messaging APIでOAuth連携後、日次同期',
  },
  {
    key: 'google_analytics',
    label: 'Google Analytics',
    icon: '📊',
    description: 'LPアクセス数・流入元・滞在時間・CVRを自動取得',
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    status_note: 'GA4 APIでOAuth連携後、自動同期',
  },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') return (
    <Badge variant="success" className="gap-1">
      <CheckCircle className="h-3 w-3" /> 接続済み
    </Badge>
  )
  if (status === 'error' || status === 'expired') return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" /> エラー
    </Badge>
  )
  if (status === 'pending') return (
    <Badge variant="warning" className="gap-1">
      <Clock className="h-3 w-3" /> 処理中
    </Badge>
  )
  return (
    <Badge variant="secondary" className="gap-1">
      <WifiOff className="h-3 w-3" /> 未連携
    </Badge>
  )
}

export default async function IntegrationsPage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('store_id', params.storeId)

  const connectionMap = Object.fromEntries((connections ?? []).map(c => [c.platform, c]))

  const connectedCount = (connections ?? []).filter(c => c.status === 'connected').length

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">外部サービス連携</h1>
        <p className="text-sm text-muted-foreground mt-1">
          各広告媒体・サービスと連携すると、データが自動でダッシュボードに反映されます
        </p>
      </div>

      {/* 連携状況サマリー */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl">
            {connectedCount}
          </div>
          <div>
            <p className="font-semibold">/ {PLATFORMS.length} サービス連携中</p>
            <p className="text-sm text-muted-foreground">
              未連携のサービスは手入力・CSVインポートでデータを登録できます
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 各プラットフォームカード */}
      <div className="space-y-3">
        {PLATFORMS.map(platform => {
          const conn = connectionMap[platform.key]
          const status = conn?.status ?? 'disconnected'

          return (
            <Card key={platform.key} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">{platform.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{platform.label}</h3>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{platform.description}</p>

                    {conn?.external_account_name && (
                      <p className="text-xs mt-1.5">
                        接続アカウント: <span className="font-medium">{conn.external_account_name}</span>
                      </p>
                    )}
                    {conn?.last_synced_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        最終同期: {format(new Date(conn.last_synced_at), 'M月d日 HH:mm', { locale: ja })}
                      </p>
                    )}
                    {conn?.error_message && status === 'error' && (
                      <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                        ⚠️ {conn.error_message}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-2">
                      {status === 'connected' ? (
                        <span className="text-xs text-green-700 font-medium">✓ データ自動同期中</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed">
                            🔗 連携する（準備中）
                          </span>
                          <a
                            href={platform.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            API仕様を確認
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                      📋 {platform.status_note}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 手動入力案内 */}
      <Card className="border-dashed">
        <CardContent className="p-5 text-center">
          <p className="font-medium text-sm">API連携前でもご利用いただけます</p>
          <p className="text-sm text-muted-foreground mt-1">
            ダッシュボードのデータは手入力またはCSVインポートでも登録できます。<br />
            API連携後は自動的にデータが更新されます。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
