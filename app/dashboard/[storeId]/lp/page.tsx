import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, ExternalLink, Edit, Globe, Clock, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface LandingPage {
  id: string
  title: string | null
  main_image_url: string | null
  published_url: string | null
  status: 'published' | 'draft' | 'archived' | string
  line_button_url: string | null
  updated_at: string
  created_at: string
}

interface Props {
  params: { storeId: string }
}

export default async function LpPage({ params }: Props) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: pages, error } = await supabase
    .from('lp_pages')
    .select('id, title, main_image_url, published_url, status, line_button_url, updated_at, created_at')
    .eq('store_id', params.storeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-full bg-gray-50/60 flex items-center justify-center">
        <p className="text-sm text-red-500">データの取得に失敗しました</p>
      </div>
    )
  }

  const publishedCount = (pages ?? []).filter(p => p.status === 'published').length

  return (
    <div className="min-h-full bg-gray-50/60">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-10 space-y-6">

        {/* ヘッダー */}
        <div>
          <h1 className="text-[22px] font-black tracking-tight text-gray-900">LP管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">全 {(pages ?? []).length}件 · 公開中 {publishedCount}件</p>
        </div>

        {/* お知らせバナー */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3.5 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 leading-relaxed">
            LP作成・デザイン変更はパートナーにお問い合わせください。このページではLPの確認・プレビューができます。
          </p>
        </div>

        {/* LINEボタン未設定の警告 */}
        {(pages ?? []).some(p => p.status === 'published' && !p.line_button_url) && (
          <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3.5 flex items-start gap-3">
            <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-orange-700 font-semibold">LINEボタンが未設定のLPがあります</p>
              <p className="text-xs text-orange-500 mt-0.5">LINEボタンを設定するとお問い合わせが増えます。パートナーに依頼してください。</p>
            </div>
          </div>
        )}

        {/* リスト */}
        {(pages ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <FileText className="mx-auto h-9 w-9 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-400">LPはまだ作成されていません</p>
            <p className="text-xs text-gray-400 mt-1">パートナーにLP作成をご依頼ください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(pages ?? []).map(page => {
              const isPublished = page.status === 'published'
              const title = page.title ?? '無題のLP'
              const previewUrl = page.published_url ?? null

              return (
                <div
                  key={page.id}
                  className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                >
                  {/* サムネイル */}
                  {page.main_image_url ? (
                    <div className="relative h-36 w-full overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.main_image_url}
                        alt={title}
                        className="w-full h-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-24 w-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
                      <Globe className="h-10 w-10 text-indigo-200" />
                    </div>
                  )}

                  {/* 情報 */}
                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-gray-900 truncate">{title}</h3>
                          <span className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          )}>
                            {isPublished ? '公開中' : page.status === 'archived' ? 'アーカイブ' : '下書き'}
                          </span>
                          {!page.line_button_url && isPublished && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                              LINEボタン未設定
                            </span>
                          )}
                        </div>

                        <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                          <Clock className="h-3 w-3" />
                          更新: {format(new Date(page.updated_at), 'M月d日', { locale: ja })}
                        </p>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex items-center gap-2 shrink-0">
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors px-3 py-2 rounded-full hover:bg-indigo-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            プレビュー
                          </a>
                        )}
                        <Link
                          href={`/dashboard/${params.storeId}/lp/${page.id}/edit`}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-3 py-2 rounded-full hover:bg-indigo-50"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          編集
                        </Link>
                      </div>
                    </div>

                    {previewUrl && (
                      <p className="text-[10px] text-gray-300 mt-2 font-mono truncate">
                        {previewUrl}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
