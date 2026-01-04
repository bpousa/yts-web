/**
 * Pronunciation Rules API
 * GET /api/pronunciation-rules - List user's pronunciation rules
 * POST /api/pronunciation-rules - Create new rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createRuleSchema = z.object({
  find_text: z.string().min(1, 'Find text is required'),
  replace_with: z.string().min(1, 'Replace with is required'),
  is_regex: z.boolean().optional().default(false),
})

// ============================================
// GET - List Pronunciation Rules
// ============================================

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rules, error } = await supabase
      .from('pronunciation_rules')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch pronunciation rules:', error)
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
    }

    return NextResponse.json({ rules: rules || [] })
  } catch (error) {
    console.error('GET /api/pronunciation-rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// POST - Create Pronunciation Rule
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createRuleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { find_text, replace_with, is_regex } = validationResult.data

    const { data: rule, error } = await supabase
      .from('pronunciation_rules')
      .insert({
        user_id: user.id,
        find_text,
        replace_with,
        is_regex,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'Rule already exists for this text' }, { status: 409 })
      }
      console.error('Failed to create pronunciation rule:', error)
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
    }

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error('POST /api/pronunciation-rules error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
