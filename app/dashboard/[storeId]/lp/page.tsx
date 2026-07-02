import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileText, ExternalLink, Edit, Globe, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default async function LpListPage({ params }: { params: { storeId: string } }) {
  const supabase = createClient()
  const [{ data: lps }, { data: store }] = await Promise.all([
    supabase.from('lp_pages').select('*').eq('store_id', params.storeId).is('deleted_at', null).order('updated_at', { ascending: false }),
    supabase.from('stores').select('slug').eq('id', params.storeId).single(),
  ])

  const publishedCount = lps?.filter(l => l.status === 'published').length ?? 0

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto p-4 md:p-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">LP 管理</h1>
            <p className="text-muted-foreground mt-1">
              {lps?.length ?? 0}件 ·{' '}
              <span className={publishedCount > 0 ? 'text-emerald-600 font-medium' : ''}>
                {publishedCount > 0 ? `${publishedCount}件 公開中` : '公開なし'}
              </span>
            </p>
          </div>
          <Link href={`/dashboard/${params.storeId}/lp/new`}>
            <button className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="h-4 w-4" />
              新しい LP を作る
            </button>
          </Link>
        </div>

        {/* List */}
        {!lps || lps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/20 bg-card py-16 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-muted mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-semibold">LP がまだありません</p>
            <p className="text-sm text-muted-foreground mt-1">LP（ランディングページ）を作って集客を始めましょう</p>
            <Link href={`/dashboard/${params.storeId}/lp/new`}>
              <button className="mt-5 flex items-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 hover:bg-primary/90 transition-colors mx-auto">
                <Plus className="h-4 w-4" />
                最初の LP を作る
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {lps.map(lp => {
              const isPublished = lp.status === 'published'
              return (
                <div
                  key={lp.id}
                  className={cn(
                    'rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5',
                    isPublished && 'border-emerald-200 shadow-sm shadow-emerald-50'
                  )}
                >
                  <div className="flex items-start gap-4 p-5">
                    {/* Thumbnail */}
                    {lp.main_image_url ? (
                      <img src={lp.main_image_url} alt="" className="h-16 w-24 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className={cn(
                        'flex h-16 w-24 shrink-0 items-center justify-center rounded-xl',
                        isPublished ? 'bg-emerald-50' : 'bg-muted'
                      )}>
                        <FileText className={cn('h-6 w-6', isPublished ? 'text-emerald-500' : 'text-muted-foreground')} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{lp.title || '無題のLP'}</h3>
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                          isPublished
                            ? 'bg-emerald-100 text-emerald-700'
                            : lp.status === 'draft'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {isPublished && <Globe className="h-3 w-3" />}
                          {lp.status === 'draft' && <Clock className="h-3 w-3" />}
                          {isPublished ? '公開中' : lp.status === 'draft' ? '下書き' : 'アーカイブ'}
                        </span>
                      </div>

                      {lp.catch_copy && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{lp.catch_copy}</p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(lp.updated_at), 'M月d日 更新', { locale: ja })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {isPublished && store?.slug && (
                        <Link href={`/lp/${store.slug}`} target="_blank">
                          <button className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card hover:bg-muted transition-colors">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </Link>
                      )}
                      <Link href={`/dashboard/${params.storeId}/lp/${lp.id}/edit`}>
                        <button className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition-colors">
                          <Edit className="h-3.5 w-3.5" />
                          編集
                        </button>
                      </Link>
                    </div>
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
