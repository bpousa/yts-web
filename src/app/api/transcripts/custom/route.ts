/**
 * Custom Transcripts API
 * POST /api/transcripts/custom - Add custom content (scripts, notes, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProject } from '@/lib/supabase/helpers'
import { z } from 'zod'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

const customTranscriptSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  content: z.string().min(1, 'Content is required'),
  projectName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'transcripts')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = customTranscriptSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { title, content, projectName } = validationResult.data

    // Create or get project
    const projectId = projectName
      ? await getOrCreateProject(supabase, user.id, projectName)
      : null

    // Generate a unique ID for custom content
    const customId = `custom-${Date.now()}`

    // Save transcript to database
    const { data: transcript, error: insertError } = await supabase
      .from('transcripts')
      .insert({
        user_id: user.id,
        project_id: projectId,
        video_id: customId,
        video_title: title,
        video_url: null,
        content: content,
        source: 'custom',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save transcript: ${insertError.message}` },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      id: transcript.id,
      videoId: transcript.video_id,
      title: transcript.video_title,
      videoUrl: transcript.video_url,
      content: transcript.content,
      source: transcript.source,
      hasTimestamps: transcript.has_timestamps,
      projectId: transcript.project_id,
      createdAt: transcript.created_at,
      message: 'Custom content saved successfully',
    }, { status: 201 })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response

  } catch (error) {
    console.error('POST /api/transcripts/custom error:', error)

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
