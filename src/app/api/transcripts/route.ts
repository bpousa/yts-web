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

    return NextResponse.json({
      transcripts: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
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

    return NextResponse.json({
      transcript,
      source: result.source,
      message: result.source === 'whisper'
        ? 'Transcript fetched using audio transcription (no captions available)'
        : 'Transcript fetched successfully',
    }, { status: 201 })

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
