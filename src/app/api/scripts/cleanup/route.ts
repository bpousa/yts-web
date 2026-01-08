/**
 * Script Cleanup API
 * POST /api/scripts/cleanup - Parse and clean up a script for TTS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  parseScript,
  parseScriptWithMode,
  preprocessTextForTTS,
  estimateDuration,
  formatDuration,
} from '@/lib/services/script-parser.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

const cleanupRequestSchema = z.object({
  script: z.string().min(1, 'Script is required').max(500000, 'Script too long'),
  mode: z.enum(['single', 'podcast']),
  speaker1Name: z.string().optional().default('Narrator'),
  speaker2Name: z.string().optional().default('Guest'),
})

interface CleanedSegment {
  speaker: string
  text: string
  originalText: string
  hasChanges: boolean
  lineNumber: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse request body
    const body = await request.json()
    const validationResult = cleanupRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { script, mode, speaker1Name, speaker2Name } = validationResult.data

    // Parse the script based on selected mode
    const parsed = parseScriptWithMode(script, mode, speaker1Name, speaker2Name)

    // Process each segment - only apply TTS preprocessing (no AI)
    const cleanedSegments: CleanedSegment[] = []

    for (const segment of parsed.segments) {
      // Apply TTS preprocessing (numbers, dollars, percentages, markdown)
      const processedText = preprocessTextForTTS(segment.text)

      cleanedSegments.push({
        speaker: segment.speaker,
        text: processedText,
        originalText: segment.originalText,
        hasChanges: processedText !== segment.originalText,
        lineNumber: segment.lineNumber,
      })
    }

    // Calculate estimated duration
    const durationSeconds = estimateDuration(cleanedSegments.map(s => ({
      ...s,
      text: s.text,
      originalText: s.originalText,
      lineNumber: s.lineNumber,
      speaker: s.speaker,
    })))

    const response = NextResponse.json({
      mode: parsed.mode,
      speakers: parsed.speakers,
      segments: cleanedSegments,
      estimatedDuration: durationSeconds,
      estimatedDurationFormatted: formatDuration(durationSeconds),
      totalSegments: cleanedSegments.length,
      segmentsWithChanges: cleanedSegments.filter(s => s.hasChanges).length,
    })

    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response

  } catch (error) {
    console.error('POST /api/scripts/cleanup error:', error)

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
