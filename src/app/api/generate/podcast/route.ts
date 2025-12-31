/**
 * Podcast Generation API
 * POST /api/generate/podcast - Generate podcast from content
 * GET /api/generate/podcast - List podcast jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  generatePodcastFromContent,
  listPodcastJobs,
} from '@/lib/services/podcast.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

// ============================================
// VALIDATION SCHEMA
// ============================================

const generatePodcastSchema = z.object({
  contentId: z.string().uuid('Invalid content ID'),
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
  ttsProvider: z.enum(['google', 'elevenlabs', 'none']).default('none'),
  voiceHost1: z.string().optional(),
  voiceHost2: z.string().optional(),
})

// ============================================
// POST - Generate Podcast
// ============================================

export async function POST(request: NextRequest) {
  try {
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
    const rateLimitResult = await checkRateLimit(user.id, 'generate')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = generatePodcastSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const options = validationResult.data

    // Generate podcast (script only or full with audio)
    const job = await generatePodcastFromContent(user.id, {
      contentId: options.contentId,
      targetDuration: options.targetDuration,
      tone: options.tone,
      hostNames: options.hostNames,
      hostRoles: options.hostRoles,
      focusGuidance: options.focusGuidance,
      includeIntro: options.includeIntro,
      includeOutro: options.includeOutro,
      ttsProvider: options.ttsProvider,
      voiceHost1: options.voiceHost1,
      voiceHost2: options.voiceHost2,
    })

    const response = NextResponse.json({ job }, { status: 201 })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('POST /api/generate/podcast error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// GET - List Podcast Jobs
// ============================================

export async function GET(request: NextRequest) {
  try {
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

    // Get query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const status = searchParams.get('status') || undefined

    const jobs = await listPodcastJobs(user.id, { limit, status })

    const response = NextResponse.json({ jobs })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('GET /api/generate/podcast error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
