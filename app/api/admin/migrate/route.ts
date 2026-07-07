import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Client } from 'pg'

export async function GET() {
  const results: Record<string, any> = {}

  // 1. Supabase Storage bucket作成
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = buckets?.some(b => b.id === 'lp-images')
    if (!exists) {
      const { error } = await supabase.storage.createBucket('lp-images', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      })
      results.bucket = error ? { error: error.message } : 'created'
    } else {
      results.bucket = 'already_exists'
    }
  } catch (e: any) {
    results.bucket_error = e.message
  }

  // 2. pg経由でDDL実行
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.iqovsiadmkayldltvfxc',
    password: process.env.SUPABASE_DB_PASSWORD || '1PageStudio2024!DB#secure',
    ssl: { rejectUnauthorized: false }
  })
  try {
    await client.connect()
    await client.query('ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS header_image_url TEXT')
    results.column = 'added'
    await client.end()
  } catch (e: any) {
    results.column_error = e.message
    try { await client.end() } catch {}
  }

  return NextResponse.json({ ok: true, results })
}
