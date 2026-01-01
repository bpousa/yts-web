/**
 * Batch Transcripts API
 * POST /api/transcripts/batch - Fetch multiple transcripts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProject } from '@/lib/supabase/helpers'
import { batchFetchTranscriptSchema } from '@/lib/utils/validators'
import { fetchTranscriptsBatch } from '@/lib/services/transcript.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit (stricter for batch operations)
    const rateLimitResult = await checkRateLimit(user.id, 'transcriptsBatch')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = batchFetchTranscriptSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { urls, includeTimestamps, enableFallback, projectName } = validationResult.data

    // Fetch all transcripts
    const results = await fetchTranscriptsBatch(urls, {
      includeTimestamps,
      enableFallback,
    })

    // Create or get project
    const projectId = projectName
      ? await getOrCreateProject(supabase, user.id, projectName)
      : null

    // Save successful transcripts and transform to camelCase
    interface TranscriptRow {
      id: string
      video_id: string
      video_title: string
      video_url: string
      content: string
      source: string
      has_timestamps: boolean | null
      project_id: string | null
      created_at: string | null
    }
    const savedTranscripts: TranscriptRow[] = []
    for (const result of results.successful) {
      const { data: transcript, error: insertError } = await supabase
        .from('transcripts')
        .insert({
          user_id: user.id,
          project_id: projectId,
          video_id: result.videoId,
          video_title: result.title,
          video_url: `https://www.youtube.com/watch?v=${result.videoId}`,
          content: result.transcript,
          source: result.source,
        })
        .select()
        .single()

      if (!insertError && transcript) {
        savedTranscripts.push(transcript as TranscriptRow)
      }
    }

    // Transform to camelCase to match UI expectations
    // UI expects `successful` to be an array (not a count)
    const response = NextResponse.json({
      successful: savedTranscripts.map(t => ({
        id: t.id,
        videoId: t.video_id,
        title: t.video_title,
        videoUrl: t.video_url,
        content: t.content,
        source: t.source === 'official' ? 'youtube' : t.source,
        hasTimestamps: t.has_timestamps,
        projectId: t.project_id,
        createdAt: t.created_at,
      })),
      failed: results.failed,
      total: urls.length,
    }, { status: 201 })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response

  } catch (error) {
    console.error('POST /api/transcripts/batch error:', error)

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
