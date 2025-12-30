/**
 * Voice Management API
 * GET /api/voices - List user's saved voices
 * POST /api/voices - Save a voice to profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

// ============================================
// VALIDATION SCHEMA
// ============================================

const saveVoiceSchema = z.object({
  voice_id: z.string().min(1, 'Voice ID is required'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  gender: z.enum(['male', 'female', 'neutral']).optional(),
  accent: z.string().max(50).optional(),
  age: z.string().max(50).optional(),
  preview_url: z.string().url().optional().nullable(),
  source: z.enum(['library', 'designed', 'cloned']),
  design_prompt: z.string().max(500).optional(),
})

// ============================================
// GET - List User's Saved Voices
// ============================================

export async function GET(request: NextRequest) {
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
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Fetch user's saved voices
    const { data: voices, error } = await supabase
      .from('user_voices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const response = NextResponse.json({ voices: voices || [] })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('GET /api/voices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST - Save Voice to Profile
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
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = saveVoiceSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const voiceData = validationResult.data

    // Check if voice already saved
    const { data: existing } = await supabase
      .from('user_voices')
      .select('id')
      .eq('user_id', user.id)
      .eq('voice_id', voiceData.voice_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Voice already saved to your profile' },
        { status: 409 }
      )
    }

    // Save the voice
    const { data: voice, error } = await supabase
      .from('user_voices')
      .insert({
        user_id: user.id,
        provider: 'elevenlabs',
        ...voiceData,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const response = NextResponse.json({ voice }, { status: 201 })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('POST /api/voices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
