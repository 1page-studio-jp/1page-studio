import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: { lpId: string } }
) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

    // ファイルサイズチェック (5MB上限)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${params.lpId}/header.${ext}`

    // Storage にアップロード
    const { error: uploadError } = await supabase.storage
      .from('lp-images')
      .upload(fileName, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('lp-images')
      .getPublicUrl(fileName)

    // lp_pagesのheader_image_urlを更新
    const { error: updateError } = await supabase
      .from('lp_pages')
      .update({ header_image_url: publicUrl })
      .eq('id', params.lpId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { lpId: string } }
) {
  try {
    // ストレージから削除
    const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    for (const ext of exts) {
      await supabase.storage.from('lp-images').remove([`${params.lpId}/header.${ext}`])
    }

    // DBをnullに更新
    await supabase.from('lp_pages').update({ header_image_url: null }).eq('id', params.lpId)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
