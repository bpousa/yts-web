/**
 * Single Tone Profile API
 * GET /api/tones/[id] - Get tone profile by ID
 * PUT /api/tones/[id] - Update tone profile
 * DELETE /api/tones/[id] - Delete tone profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateToneProfileSchema } from '@/lib/utils/validators'
import {
  getToneProfileById,
  updateToneProfile,
  deleteToneProfile,
} from '@/lib/services/tone.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================
// GET - Get Single Tone Profile
// ============================================

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const toneProfile = await getToneProfileById(id, user.id)

    if (!toneProfile) {
      return NextResponse.json({ error: 'Tone profile not found' }, { status: 404 })
    }

    return NextResponse.json({ toneProfile })
  } catch (error) {
    console.error('GET /api/tones/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - Update Tone Profile
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = updateToneProfileSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const toneProfile = await updateToneProfile(id, user.id, validationResult.data)

    return NextResponse.json({ toneProfile })
  } catch (error) {
    console.error('PUT /api/tones/[id] error:', error)

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

// ============================================
// DELETE - Delete Tone Profile
// ============================================

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await deleteToneProfile(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tones/[id] error:', error)

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
