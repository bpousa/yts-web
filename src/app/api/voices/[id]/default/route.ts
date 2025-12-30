/**
 * Set Default Voice API
 * PUT /api/voices/[id]/default - Set voice as default for host1 or host2
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

const setDefaultSchema = z.object({
  host: z.enum(['host1', 'host2']),
})

export async function PUT(
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

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = setDefaultSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { host } = validationResult.data
    const isHost1 = host === 'host1'

    // First, verify the voice belongs to the user
    const { data: voice, error: fetchError } = await supabase
      .from('user_voices')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !voice) {
      return NextResponse.json({ error: 'Voice not found' }, { status: 404 })
    }

    // Clear existing default for this host
    const columnToUpdate = isHost1 ? 'is_default_host1' : 'is_default_host2'

    await supabase
      .from('user_voices')
      .update({ [columnToUpdate]: false })
      .eq('user_id', user.id)
      .eq(columnToUpdate, true)

    // Set this voice as default
    const { data: updatedVoice, error: updateError } = await supabase
      .from('user_voices')
      .update({ [columnToUpdate]: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const response = NextResponse.json({ voice: updatedVoice })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response
  } catch (error) {
    console.error('PUT /api/voices/[id]/default error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
