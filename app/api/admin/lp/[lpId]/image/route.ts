import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set() {},
        remove() {}
      }
    }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: { lpId: string } }
) {
  const supabase = makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `${params.lpId}/header.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('lp-images')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('lp-images').getPublicUrl(storagePath)

  await supabase.from('lp_pages').update({ header_image_url: publicUrl }).eq('id', params.lpId)

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { lpId: string } }
) {
  const supabase = makeSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg']
  await supabase.storage.from('lp-images').remove(
    exts.map(ext => `${params.lpId}/header.${ext}`)
  )

  await supabase.from('lp_pages').update({ header_image_url: null }).eq('id', params.lpId)

  return NextResponse.json({ ok: true })
}
