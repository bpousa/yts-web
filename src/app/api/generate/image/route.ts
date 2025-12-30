/**
 * Image Generation API
 * POST /api/generate/image - Generate image for content
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateImageSchema } from '@/lib/utils/validators'
import { generateImageForContent } from '@/lib/services/content.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = generateImageSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    // Generate image
    const imageUrl = await generateImageForContent(user.id, {
      contentId: validationResult.data.contentId,
      style: validationResult.data.style,
      mood: validationResult.data.mood,
      customPrompt: validationResult.data.customPrompt,
      aspectRatio: validationResult.data.aspectRatio,
    })

    return NextResponse.json({
      imageUrl,
      message: 'Image generated successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/generate/image error:', error)

    if (error instanceof Error) {
      // Handle safety filter blocks
      if (error.message.includes('SAFETY')) {
        return NextResponse.json(
          { error: 'Image generation was blocked by safety filters. Please try a different prompt.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
