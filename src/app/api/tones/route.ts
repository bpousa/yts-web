/**
 * Tone Profiles API
 * GET /api/tones - List user's tone profiles
 * POST /api/tones - Create new tone profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createToneProfileSchema } from '@/lib/utils/validators'
import { getToneProfiles, createToneProfile } from '@/lib/services/tone.service'

// ============================================
// GET - List Tone Profiles
// ============================================

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('GET /api/tones - user:', user?.id, 'authError:', authError?.message)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const toneProfiles = await getToneProfiles(user.id)
    console.log('GET /api/tones - found', toneProfiles.length, 'profiles')

    return NextResponse.json({ toneProfiles })
  } catch (error) {
    console.error('GET /api/tones error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Create Tone Profile
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
    const validationResult = createToneProfileSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const toneProfile = await createToneProfile(user.id, validationResult.data)

    return NextResponse.json({ toneProfile }, { status: 201 })
  } catch (error) {
    console.error('POST /api/tones error:', error)

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
