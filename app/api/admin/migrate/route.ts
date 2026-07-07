import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET(request: NextRequest) {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.iqovsiadmkayldltvfxc',
    password: process.env.DB_PASSWORD || '1PageStudio2024!DB#secure',
    ssl: { rejectUnauthorized: false }
  })

  const results: Record<string, string> = {}

  try {
    await client.connect()

    const statements = [
      {
        key: 'header_image_col',
        sql: `ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS header_image_url TEXT`
      },
      {
        key: 'policy_select',
        sql: `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='lp_images_select') THEN CREATE POLICY "lp_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'lp-images'); END IF; END $do$`
      },
      {
        key: 'policy_insert',
        sql: `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='lp_images_insert') THEN CREATE POLICY "lp_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lp-images'); END IF; END $do$`
      },
      {
        key: 'policy_update',
        sql: `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='lp_images_update') THEN CREATE POLICY "lp_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'lp-images'); END IF; END $do$`
      },
      {
        key: 'policy_delete',
        sql: `DO $do$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='lp_images_delete') THEN CREATE POLICY "lp_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'lp-images'); END IF; END $do$`
      }
    ]

    for (const { key, sql } of statements) {
      try {
        await client.query(sql)
        results[key] = 'ok'
      } catch (e: any) {
        results[key] = e.message
      }
    }

    await client.end()
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, results })
}
