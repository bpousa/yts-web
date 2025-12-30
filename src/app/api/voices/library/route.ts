/**
 * Voice Library API
 * GET /api/voices/library - Fetch ElevenLabs voice library
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchElevenLabsVoices } from '@/lib/services/tts.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

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

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const gender = searchParams.get('gender')
    const accent = searchParams.get('accent')
    const search = searchParams.get('search')

    // Fetch voices from ElevenLabs
    let voices = await fetchElevenLabsVoices()

    // Apply filters
    if (gender) {
      voices = voices.filter(v =>
        v.labels?.gender?.toLowerCase() === gender.toLowerCase()
      )
    }

    if (accent) {
      voices = voices.filter(v =>
        v.labels?.accent?.toLowerCase().includes(accent.toLowerCase())
      )
    }

    if (search) {
      const searchLower = search.toLowerCase()
      voices = voices.filter(v =>
        v.name.toLowerCase().includes(searchLower) ||
        v.labels?.description?.toLowerCase().includes(searchLower) ||
        v.labels?.accent?.toLowerCase().includes(searchLower)
      )
    }

    // Transform to consistent format
    const transformedVoices = voices.map(v => ({
      voice_id: v.voice_id,
      name: v.name,
      preview_url: v.preview_url,
      category: v.category,
      gender: v.labels?.gender || null,
      accent: v.labels?.accent || null,
      age: v.labels?.age || null,
      description: v.labels?.description || v.description || null,
      use_case: v.labels?.use_case || null,
    }))

    const response = NextResponse.json({
      voices: transformedVoices,
      total: transformedVoices.length,
    })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('GET /api/voices/library error:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
