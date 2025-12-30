/**
 * Voice Preview API
 * POST /api/voices/preview - Generate TTS preview for a voice
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateVoicePreview } from '@/lib/services/tts.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

const previewSchema = z.object({
  voice_id: z.string().min(1, 'Voice ID is required'),
  text: z.string().min(1).max(500).optional(),
})

const DEFAULT_PREVIEW_TEXT = "Hello! This is a preview of how this voice sounds. I hope you like it!"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = previewSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { voice_id, text } = validationResult.data
    const previewText = text || DEFAULT_PREVIEW_TEXT

    // Generate preview audio
    const result = await generateVoicePreview(voice_id, previewText)

    const response = NextResponse.json({
      audio_base64: result.audioBase64,
      content_type: 'audio/mpeg',
      text: previewText,
      duration: result.duration,
    })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('POST /api/voices/preview error:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('invalid')) {
        return NextResponse.json({ error: 'Voice not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
