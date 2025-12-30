/**
 * Voice Design API
 * POST /api/voices/design - Design a custom voice from description
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { designVoice, saveDesignedVoice } from '@/lib/services/tts.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

const designVoiceSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  preview_text: z.string().max(500).optional(),
})

const saveDesignedVoiceSchema = z.object({
  generated_voice_id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

/**
 * POST /api/voices/design
 * Design a new voice from description or save a designed voice
 *
 * Body options:
 * 1. { description: string, preview_text?: string } - Generate voice previews
 * 2. { generated_voice_id: string, name: string, description?: string } - Save a designed voice
 */
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

    // Check rate limit (voice design is expensive, use stricter limit)
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    const body = await request.json()

    // Check if this is a save request or design request
    if ('generated_voice_id' in body) {
      // Save a designed voice
      const validationResult = saveDesignedVoiceSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validationResult.error.flatten() },
          { status: 400 }
        )
      }

      const { generated_voice_id, name, description } = validationResult.data

      const savedVoice = await saveDesignedVoice(generated_voice_id, name, description)

      const response = NextResponse.json({
        voice: {
          voice_id: savedVoice.voice_id,
          name: savedVoice.name,
          preview_url: savedVoice.preview_url,
          description: description || savedVoice.description,
        },
        message: 'Voice saved successfully',
      }, { status: 201 })
      applyRateLimitHeaders(response.headers, rateLimitResult)
      return response
    } else {
      // Design voice from description
      const validationResult = designVoiceSchema.safeParse(body)
      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validationResult.error.flatten() },
          { status: 400 }
        )
      }

      const { description, preview_text } = validationResult.data

      const designResult = await designVoice(description, preview_text)

      const response = NextResponse.json({
        previews: designResult.previews.map(p => ({
          generated_voice_id: p.generated_voice_id,
          audio_base64: p.audio_base_64,
          description: description,
        })),
        message: 'Voice previews generated. Use generated_voice_id to save.',
      })
      applyRateLimitHeaders(response.headers, rateLimitResult)
      return response
    }
  } catch (error) {
    console.error('POST /api/voices/design error:', error)

    if (error instanceof Error) {
      // Check for ElevenLabs specific errors
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { error: 'Voice design quota exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
