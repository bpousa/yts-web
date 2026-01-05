/**
 * Script Cleanup API
 * POST /api/scripts/cleanup - Parse and clean up a script for TTS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateContent } from '@/lib/services/claude.service'
import {
  parseScript,
  preprocessTextForTTS,
  estimateDuration,
  formatDuration,
  type ScriptSegment,
} from '@/lib/services/script-parser.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

const cleanupRequestSchema = z.object({
  script: z.string().min(1, 'Script is required').max(100000, 'Script too long'),
  fixTypos: z.boolean().optional().default(true),
})

interface CleanedSegment {
  speaker: string
  text: string
  originalText: string
  hasChanges: boolean
  lineNumber: number
}

const TYPO_FIX_PROMPT = `You are a script editor preparing text for text-to-speech synthesis.

Your task is to fix typos and grammar errors in the following script segment while:
1. PRESERVING all [bracket tags] exactly as written - these are audio emotion cues (e.g., [laughing], [whisper], [excited])
2. Keeping the meaning and intent unchanged
3. Fixing obvious spelling and grammar errors
4. NOT changing style, tone, or word choices unless they're clearly wrong
5. NOT adding or removing content
6. Keeping proper nouns and technical terms as-is unless obviously misspelled

Return ONLY the corrected text, nothing else. If no changes are needed, return the original text exactly.`

async function fixTyposWithClaude(text: string): Promise<string> {
  try {
    const result = await generateContent(
      TYPO_FIX_PROMPT,
      text,
      { temperature: 0.1, maxTokens: 2000 }
    )
    return result.trim()
  } catch (error) {
    console.error('Claude typo fix error:', error)
    // On error, return original text
    return text
  }
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
    const rateLimitResult = await checkRateLimit(user.id, 'generate')
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

    const { script, fixTypos } = validationResult.data

    // Parse the script into segments
    const parsed = parseScript(script)

    // Process each segment
    const cleanedSegments: CleanedSegment[] = []

    for (const segment of parsed.segments) {
      let processedText = segment.text

      // Step 1: Fix typos with Claude (optional)
      if (fixTypos) {
        processedText = await fixTyposWithClaude(processedText)
      }

      // Step 2: Apply TTS preprocessing (numbers, dollars, percentages)
      processedText = preprocessTextForTTS(processedText)

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
