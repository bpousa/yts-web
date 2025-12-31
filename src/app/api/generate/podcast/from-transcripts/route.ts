/**
 * Podcast from Transcripts API
 * POST /api/generate/podcast/from-transcripts - Generate podcast from transcripts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import {
  generatePodcastScript,
  type PodcastJob,
} from '@/lib/services/podcast.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'
import { estimateTotalDuration } from '@/lib/prompts/podcast-generation'

// Type workaround for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

const anthropic = new Anthropic()

// ============================================
// VALIDATION SCHEMA
// ============================================

const generateFromTranscriptsSchema = z.object({
  transcriptIds: z.array(z.string().uuid()).min(1).max(10),
  targetDuration: z.enum(['short', 'medium', 'long']).default('medium'),
  tone: z.enum(['casual', 'professional', 'educational']).default('casual'),
  hostNames: z
    .object({
      host1: z.string().min(1).max(20),
      host2: z.string().min(1).max(20),
    })
    .optional(),
  hostRoles: z
    .object({
      host1: z.string().max(200).optional(),
      host2: z.string().max(200).optional(),
    })
    .optional(),
  focusGuidance: z.string().max(500).optional(),
  includeIntro: z.boolean().default(true),
  includeOutro: z.boolean().default(true),
})

// ============================================
// POST - Generate Podcast from Transcripts
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as AnySupabase

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'generate')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = generateFromTranscriptsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const options = validationResult.data

    // Fetch transcripts
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('id, video_title, content')
      .eq('user_id', user.id)
      .in('id', options.transcriptIds)

    if (transcriptsError) {
      return NextResponse.json(
        { error: `Failed to fetch transcripts: ${transcriptsError.message}` },
        { status: 500 }
      )
    }

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json(
        { error: 'No transcripts found' },
        { status: 404 }
      )
    }

    // Synthesize transcripts into podcast content using Claude
    const synthesizedContent = await synthesizeTranscripts(transcripts)

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('podcast_jobs')
      .insert({
        user_id: user.id,
        content_id: null, // No content ID for transcript-based generation
        status: 'generating_script',
        progress: 0,
        options: {
          targetDuration: options.targetDuration,
          tone: options.tone,
          ttsProvider: 'none',
          hostNames: options.hostNames || { host1: 'Alex', host2: 'Jamie' },
          hostRoles: options.hostRoles,
          focusGuidance: options.focusGuidance,
          sourceTranscriptIds: options.transcriptIds,
        },
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: `Failed to create podcast job: ${jobError.message}` },
        { status: 500 }
      )
    }

    try {
      // Generate the podcast script from synthesized content
      const script = await generatePodcastScript(synthesizedContent, {
        hostNames: options.hostNames,
        hostRoles: options.hostRoles,
        targetDuration: options.targetDuration,
        tone: options.tone,
        focusGuidance: options.focusGuidance,
        includeIntro: options.includeIntro,
        includeOutro: options.includeOutro,
      })

      const duration = estimateTotalDuration(script.segments)

      // Update job with completed script
      const { data: updatedJob } = await supabase
        .from('podcast_jobs')
        .update({
          status: 'complete',
          progress: 100,
          script,
          duration: duration.seconds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .select()
        .single()

      const responseJob = mapJobToResponse(updatedJob || job)

      const response = NextResponse.json({ job: responseJob }, { status: 201 })
      applyRateLimitHeaders(response.headers, rateLimitResult)
      return response
    } catch (error) {
      // Update job with error
      await supabase
        .from('podcast_jobs')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      throw error
    }
  } catch (error) {
    console.error('POST /api/generate/podcast/from-transcripts error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// HELPERS
// ============================================

interface TranscriptData {
  id: string
  video_title: string
  content: string
}

/**
 * Synthesize multiple transcripts into a coherent content piece
 */
async function synthesizeTranscripts(transcripts: TranscriptData[]): Promise<string> {
  // If only one transcript, just return its content
  if (transcripts.length === 1) {
    return transcripts[0].content
  }

  // Build context for synthesis
  const transcriptSummaries = transcripts.map((t, i) =>
    `=== Transcript ${i + 1}: ${t.video_title} ===\n${t.content.substring(0, 8000)}`
  ).join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are synthesizing multiple YouTube video transcripts into a single coherent content piece for podcast conversion.

TRANSCRIPTS:
${transcriptSummaries}

Create a unified content piece that:
1. Combines the key insights and themes from all transcripts
2. Maintains a logical flow and narrative
3. Removes redundant information
4. Preserves important quotes and examples
5. Organizes content into clear sections

Output the synthesized content as clean text, ready for podcast script generation. Do not add markdown formatting, just plain text paragraphs.`,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  return responseText
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJobToResponse(job: any): PodcastJob {
  return {
    id: job.id,
    userId: job.user_id,
    contentId: job.content_id,
    status: job.status,
    progress: job.progress || 0,
    script: job.script,
    audioUrl: job.audio_url,
    duration: job.duration,
    error: job.error,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }
}
