/**
 * Podcast Audio Generation API
 * POST /api/generate/podcast/[id]/audio - Generate audio for a podcast script
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { generateAudioForJob } from '@/lib/services/podcast.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

const generateAudioSchema = z.object({
  voiceHost1: z.string().min(1, 'Voice for Host 1 is required'),
  voiceHost2: z.string().min(1, 'Voice for Host 2 is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient() as AnySupabase

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit (audio generation is expensive)
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = generateAudioSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { voiceHost1, voiceHost2 } = validationResult.data

    // Generate audio for the job
    const job = await generateAudioForJob(user.id, {
      jobId: id,
      voiceHost1,
      voiceHost2,
    })

    const response = NextResponse.json({ job })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('POST /api/generate/podcast/[id]/audio error:', error)

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Podcast job not found' }, { status: 404 })
      }
      if (error.message.includes('already in progress')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.message.includes('no script')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
