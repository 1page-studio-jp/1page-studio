import { NextResponse } from 'next/server'
import { generateLpContent } from '@/lib/openai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { store_name, industry, target, strengths } = body

    if (!store_name || !industry || !target || !strengths) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const content = await generateLpContent({ store_name, industry, target, strengths })
    return NextResponse.json(content)
  } catch (error) {
    console.error('LP content generation error:', error)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
