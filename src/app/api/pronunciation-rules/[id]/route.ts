/**
 * Pronunciation Rules API - Individual Rule
 * PUT /api/pronunciation-rules/[id] - Update rule
 * DELETE /api/pronunciation-rules/[id] - Delete rule
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateRuleSchema = z.object({
  find_text: z.string().min(1).optional(),
  replace_with: z.string().min(1).optional(),
  is_regex: z.boolean().optional(),
  is_enabled: z.boolean().optional(),
})

// ============================================
// PUT - Update Pronunciation Rule
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = updateRuleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const updates = validationResult.data

    const { data: rule, error } = await supabase
      .from('pronunciation_rules')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the rule
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
      }
      console.error('Failed to update pronunciation rule:', error)
      return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('PUT /api/pronunciation-rules/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// DELETE - Delete Pronunciation Rule
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('pronunciation_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the rule

    if (error) {
      console.error('Failed to delete pronunciation rule:', error)
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/pronunciation-rules/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
