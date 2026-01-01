/**
 * Transcripts API
 * GET /api/transcripts - List user's transcripts
 * POST /api/transcripts - Fetch new transcript from URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateProject } from '@/lib/supabase/helpers'
import { fetchTranscriptSchema } from '@/lib/utils/validators'
import { fetchTranscript } from '@/lib/services/transcript.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

// ============================================
// GET - List Transcripts
// ============================================

export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const projectId = searchParams.get('projectId')

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('transcripts')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform snake_case to camelCase for frontend compatibility
    const transcripts = (data || []).map(t => ({
      id: t.id,
      videoId: t.video_id,
      title: t.video_title,
      videoUrl: t.video_url,
      content: t.content,
      source: t.source,
      hasTimestamps: t.has_timestamps,
      projectId: t.project_id,
      createdAt: t.created_at,
    }))

    const response = NextResponse.json({
      transcripts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('GET /api/transcripts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Fetch New Transcript
// ============================================

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
    const validationResult = fetchTranscriptSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { url, includeTimestamps, enableFallback, projectName } = validationResult.data

    // Fetch the transcript
    const result = await fetchTranscript(url, {
      includeTimestamps,
      enableFallback,
    })

    // Create or get project
    const projectId = projectName
      ? await getOrCreateProject(supabase, user.id, projectName)
      : null

    // Save transcript to database
    const { data: transcript, error: insertError } = await supabase
      .from('transcripts')
      .insert({
        user_id: user.id,
        project_id: projectId,
        video_id: result.videoId,
        video_title: result.title,
        video_url: url,
        content: result.transcript,
        source: result.source,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save transcript: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Transform to camelCase to match GET response and UI expectations
    const response = NextResponse.json({
      id: transcript.id,
      videoId: transcript.video_id,
      title: transcript.video_title,
      videoUrl: transcript.video_url,
      content: transcript.content,
      source: transcript.source === 'official' ? 'youtube' : transcript.source,
      hasTimestamps: transcript.has_timestamps,
      projectId: transcript.project_id,
      createdAt: transcript.created_at,
      message: result.source === 'whisper'
        ? 'Transcript fetched using audio transcription (no captions available)'
        : 'Transcript fetched successfully',
    }, { status: 201 })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response

  } catch (error) {
    console.error('POST /api/transcripts error:', error)

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
