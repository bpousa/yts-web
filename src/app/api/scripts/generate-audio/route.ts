/**
 * Script Audio Generation API
 * POST /api/scripts/generate-audio - Generate audio from script segments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

const AUDIO_API_URL = process.env.AUDIO_API_URL || 'https://yts-audio-api-production.up.railway.app'

const generateAudioSchema = z.object({
  segments: z.array(z.object({
    speaker: z.string(),
    text: z.string(),
  })).min(1, 'At least one segment required'),
  voiceMap: z.record(z.string(), z.string()),
  title: z.string().optional(),
  saveToLibrary: z.boolean().optional().default(true),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit (use generate rate limit as this is expensive)
    const rateLimitResult = await checkRateLimit(user.id, 'generate')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse request body
    const body = await request.json()
    const validationResult = generateAudioSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { segments, voiceMap, title, saveToLibrary } = validationResult.data

    // Validate that all speakers have voice mappings
    const speakers = [...new Set(segments.map(s => s.speaker))]
    for (const speaker of speakers) {
      if (!voiceMap[speaker]) {
        return NextResponse.json(
          { error: `No voice selected for speaker: ${speaker}` },
          { status: 400 }
        )
      }
    }

    // Call the audio API
    console.log(`[Generate Audio] Calling TTS batch API with ${segments.length} segments`)
    const audioResponse = await fetch(`${AUDIO_API_URL}/tts/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        segments,
        voiceMap,
        modelId: 'eleven_v3',
      }),
    })

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text()
      console.error('[Generate Audio] TTS API error:', errorText)
      return NextResponse.json(
        { error: `Audio generation failed: ${errorText}` },
        { status: audioResponse.status }
      )
    }

    // Get the audio buffer
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
    console.log(`[Generate Audio] Received ${audioBuffer.length} bytes of audio`)

    // Save script to library if requested
    let transcriptId: string | null = null
    if (saveToLibrary) {
      const scriptContent = segments
        .map(s => `**${s.speaker}:**\n${s.text}`)
        .join('\n\n')

      const { data: transcript, error: insertError } = await supabase
        .from('transcripts')
        .insert({
          user_id: user.id,
          video_id: `script-${Date.now()}`,
          video_title: title || `Script - ${new Date().toLocaleDateString()}`,
          video_url: '',
          content: scriptContent,
          source: 'official', // Using 'official' as 'custom' is not in the constraint
        })
        .select('id')
        .single()

      if (!insertError && transcript) {
        transcriptId = transcript.id
        console.log(`[Generate Audio] Saved script to library: ${transcriptId}`)
      }
    }

    // Return audio with metadata
    const response = new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${(title || 'script-audio').replace(/[^a-z0-9]/gi, '_')}.mp3"`,
        'X-Transcript-Id': transcriptId || '',
      },
    })

    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response

  } catch (error) {
    console.error('POST /api/scripts/generate-audio error:', error)

    if (error instanceof Error) {
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
