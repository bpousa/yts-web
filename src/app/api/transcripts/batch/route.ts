/**
 * Batch Transcripts API
 * POST /api/transcripts/batch - Fetch multiple transcripts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProject } from '@/lib/supabase/helpers'
import { batchFetchTranscriptSchema } from '@/lib/utils/validators'
import { fetchTranscriptsBatch } from '@/lib/services/transcript.service'

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

    // Save successful transcripts
    const savedTranscripts: unknown[] = []
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
        savedTranscripts.push(transcript)
      }
    }

    return NextResponse.json({
      transcripts: savedTranscripts,
      successful: results.successful.length,
      failed: results.failed,
      total: urls.length,
    }, { status: 201 })

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
