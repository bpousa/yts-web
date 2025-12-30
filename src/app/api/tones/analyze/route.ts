/**
 * Tone Analysis API
 * POST /api/tones/analyze - Analyze a writing sample and generate Style DNA
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeToneSchema } from '@/lib/utils/validators'
import { analyzeTone } from '@/lib/services/tone.service'

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
    const validationResult = analyzeToneSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { sampleText, sourceUrl } = validationResult.data

    // Analyze the tone
    const styleDna = await analyzeTone({
      sampleText,
      sourceUrl,
    })

    return NextResponse.json({
      styleDna,
      message: 'Style DNA generated successfully. You can now create a tone profile with this.',
    })
  } catch (error) {
    console.error('POST /api/tones/analyze error:', error)

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
