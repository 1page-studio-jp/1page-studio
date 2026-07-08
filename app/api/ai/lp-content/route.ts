import { NextRequest, NextResponse } from 'next/server'
import { generateLpContent } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      storeName,
      storeCategory,
      area,
      appeal_angle,
      brief,
      existing_strengths,
      existing_services,
      phone,
      business_hours,
    } = body

    if (!storeName || !storeCategory) {
      return NextResponse.json(
        { error: 'storeName と storeCategory は必須です' },
        { status: 400 }
      )
    }

    const result = await generateLpContent({
      storeName,
      storeCategory,
      area,
      brief,
      appeal_angle,
      existing_strengths,
      existing_services,
      phone,
      business_hours,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('LP content generation error:', error)
    return NextResponse.json(
      { error: 'LP生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
