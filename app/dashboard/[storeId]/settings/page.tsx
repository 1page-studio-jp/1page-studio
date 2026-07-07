import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'

export default async function SettingsPage({ params, searchParams }: {
  params: { storeId: string }
  searchParams: { success?: string; error?: string }
}) {
  const supabase = createClient()
  const storeId = params.storeId

  const [{ data: store }, { data: oauthTokens }] = await Promise.all([
    supabase.from('stores').select('*').eq('id', storeId).single(),
    supabase.from('store_oauth_tokens').select('provider, account_id, account_name, last_synced_at, is_active').eq('store_id', storeId),
  ])

  if (!store) redirect('/dashboard')

  const googleToken = oauthTokens?.find(t => t.provider === 'google_ads')
  const metaToken = oauthTokens?.find(t => t.provider === 'meta_ads')

  const successMsg = searchParams.success === 'google_connected' ? 'Google広告を連携しました'
    : searchParams.success === 'meta_connected' ? 'Meta広告を連携しました' : null
  const errorMsg = searchParams.error ? '連携に失敗しました。もう一度お試しください。' : null

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/dashboard/${storeId}`}>
          <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" />
            ダッシュボード
          </button>
        </Link>
      </div>
      <h1 className="text-xl font-bold">設定</h1>

      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* 広告連携 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold">広告アカウント連携</h2>
          <p className="text-sm text-gray-500 mt-1">連携すると広告データが毎日自動で取り込まれます</p>
        </div>

        {/* Google Ads */}
        <div className="flex items-center justify-between py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg">G</div>
            <div>
              <p className="font-medium text-sm">Google 広告</p>
              {googleToken ? (
                <p className="text-xs text-green-600">
                  ✓ 連携済み
                  {googleToken.last_synced_at && ` · 最終同期: ${new Date(googleToken.last_synced_at).toLocaleDateString('ja-JP')}`}
                </p>
              ) : (
                <p className="text-xs text-gray-400">未連携</p>
              )}
            </div>
          </div>
          <a href={`/api/oauth/google?storeId=${storeId}`}>
            <button className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              googleToken
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
              {googleToken ? '再連携' : '連携する'}
            </button>
          </a>
        </div>

        {/* Meta Ads */}
        <div className="flex items-center justify-between py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg">f</div>
            <div>
              <p className="font-medium text-sm">Meta 広告（Facebook / Instagram）</p>
              {metaToken ? (
                <p className="text-xs text-green-600">
                  ✓ 連携済み{metaToken.account_name ? ` · ${metaToken.account_name}` : ''}
                  {metaToken.last_synced_at && ` · 最終同期: ${new Date(metaToken.last_synced_at).toLocaleDateString('ja-JP')}`}
                </p>
              ) : (
                <p className="text-xs text-gray-400">未連携</p>
              )}
            </div>
          </div>
          <a href={`/api/oauth/meta?storeId=${storeId}`}>
            <button className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              metaToken
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>
              {metaToken ? '再連携' : '連携する'}
            </button>
          </a>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mt-2">
          ※ 連携後、翌日から自動でデータが取り込まれます。初日のデータは手動入力もできます。
        </div>
      </div>

      {/* 店舗基本情報 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4">店舗情報</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">店舗名</span>
            <span className="font-medium">{store.store_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">業種</span>
            <span>{store.industry || '未設定'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">プラン</span>
            <span>{store.plan || 'trial'}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">店舗情報の変更は担当パートナーにご連絡ください</p>
      </div>
    </div>
  )
}
