/**
 * Podcast Job API
 * GET /api/generate/podcast/[id] - Get job status
 * DELETE /api/generate/podcast/[id] - Delete job
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getPodcastJob,
  deletePodcastJob,
  exportScript,
} from '@/lib/services/podcast.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

// ============================================
// GET - Get Job Status
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    const job = await getPodcastJob(user.id, id)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if export format requested
    const { searchParams } = new URL(request.url)
    const exportFormat = searchParams.get('export') as 'json' | 'txt' | 'srt' | null

    if (exportFormat && job.script) {
      const exported = exportScript(job.script, exportFormat)

      const contentType = {
        json: 'application/json',
        txt: 'text/plain',
        srt: 'text/srt',
      }[exportFormat]

      return new NextResponse(exported, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="podcast-script.${exportFormat}"`,
        },
      })
    }

    const response = NextResponse.json({ job })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('GET /api/generate/podcast/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// DELETE - Delete Job
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    await deletePodcastJob(user.id, id)

    const response = NextResponse.json({ success: true })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('DELETE /api/generate/podcast/[id] error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
