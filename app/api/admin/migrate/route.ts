import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const results: any[] = []

    // 1. header_image_urlカラムをlp_pagesに追加
    const { error: colError } = await supabase.rpc('exec_migration', {
      sql: 'ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS header_image_url TEXT'
    }).maybeSingle()
    
    // rpc経由はできないので直接クエリで確認だけ
    const { data: cols } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name')
      .eq('table_name', 'lp_pages')
      .eq('column_name', 'header_image_url')
    results.push({ check_column: cols })

    // 2. Storageバケット作成
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some(b => b.id === 'lp-images')
    
    if (!exists) {
      const { data: bucket, error: bucketError } = await supabase.storage.createBucket('lp-images', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      })
      results.push({ bucket_created: bucket, bucket_error: bucketError })
    } else {
      results.push({ bucket: 'already exists' })
    }

    return NextResponse.json({ success: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
