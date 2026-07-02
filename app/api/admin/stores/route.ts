import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { getTemplate, applyTemplateToLP } from '@/lib/lp-templates'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { store_name, industry, phone_number, address, email, ownerEmail, ownerName, ownerPassword, lp_template_id } = body

    if (!store_name || !ownerEmail || !ownerPassword || !ownerName) {
      return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 })
    }

    // 1. オーナーアカウント作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { name: ownerName, role: 'owner' },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const ownerId = authData.user.id

    // 2. 店舗スラグを生成（重複を避ける）
    const baseSlug = slugify(store_name) || `store-${Date.now()}`
    let slug = baseSlug
    let attempt = 0
    while (true) {
      const { data: existing } = await supabase.from('stores').select('id').eq('slug', slug).single()
      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    // 3. 店舗作成
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        owner_id: ownerId,
        store_name,
        industry,
        phone_number,
        address,
        email,
        slug,
        status: 'trial',
      })
      .select()
      .single()

    if (storeError) {
      return NextResponse.json({ error: storeError.message }, { status: 400 })
    }

    // 4. store_users に owner として登録
    await supabase.from('store_users').insert({
      user_id: ownerId,
      store_id: store.id,
      permission_role: 'owner',
    })

    // 5. subscription（trial）を作成
    await supabase.from('subscriptions').insert({
      store_id: store.id,
      plan_name: 'trial',
      price: 0,
      status: 'trialing',
    })

    // 6. activity_log
    await supabase.from('activity_logs').insert({
      store_id: store.id,
      action: 'store_created',
      target_type: 'store',
      target_id: store.id,
    })

    // 7. LPテンプレートから自動生成
    const template = lp_template_id ? getTemplate(lp_template_id) : null
    if (template) {
      const lpData = applyTemplateToLP(template, store_name, address)
      await supabase.from('landing_pages').insert({
        store_id: store.id,
        title: `${store_name} - 公式LP`,
        status: 'draft',
        // テンプレートから生成したフィールド
        catch_copy: lpData.catch_copy || template.catch_copy,
        sub_copy: template.sub_copy,
        cta_text: template.cta_text,
        line_cta_text: template.line_cta_text,
        line_benefit: template.line_benefit,
        primary_color: template.suggested_primary_color,
        appeal_points: template.appeal_points,
        services: template.services,
        features: template.features,
        template_id: lp_template_id,
      })
    }

    return NextResponse.json({ store, lp_generated: !!template }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
