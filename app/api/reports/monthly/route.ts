import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const execFileAsync = promisify(execFile)

export async function POST(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  // Auth check
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await request.json()
  const { storeId, year, month } = body

  if (!storeId || !year || !month) {
    return NextResponse.json({ error: 'storeId, year, month required' }, { status: 400 })
  }

  // Verify store exists
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  // Output path in tmp
  const filename = `report_${storeId}_${year}_${String(month).padStart(2, '0')}.pdf`
  const outputPath = path.join(os.tmpdir(), filename)

  const scriptPath = path.join(process.cwd(), 'scripts', 'generate_monthly_report.py')

  try {
    const { stdout, stderr } = await execFileAsync('python3', [
      scriptPath,
      '--store-id', storeId,
      '--year', String(year),
      '--month', String(month),
      '--output', outputPath,
    ], {
      timeout: 60_000, // 60s max
      env: {
        ...process.env,
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
    })

    if (stderr && stderr.includes('Error')) {
      console.error('PDF generation error:', stderr)
      return NextResponse.json({ error: 'PDF generation failed', detail: stderr }, { status: 500 })
    }

    // Read the PDF
    const pdfBuffer = await fs.readFile(outputPath)

    // Clean up temp file
    await fs.unlink(outputPath).catch(() => {})

    const safeStoreName = store.store_name.replace(/[^\w　-鿿]/g, '_')
    const downloadFilename = `1PageStudio_${safeStoreName}_${year}年${month}月レポート.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err: any) {
    console.error('Report generation failed:', err)
    return NextResponse.json(
      { error: 'Report generation failed', detail: err.message },
      { status: 500 }
    )
  }
}

// GET: check if report exists / get metadata
export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')

  if (!storeId) {
    return NextResponse.json({ error: 'storeId required' }, { status: 400 })
  }

  // Return list of available months (based on ad_daily_reports data)
  const { data: months } = await supabase
    .from('ad_daily_reports')
    .select('date')
    .eq('store_id', storeId)
    .order('date', { ascending: false })
    .limit(12)

  const uniqueMonths = [...new Set(
    (months || []).map(r => r.date.slice(0, 7))
  )].slice(0, 12)

  return NextResponse.json({ months: uniqueMonths })
}
