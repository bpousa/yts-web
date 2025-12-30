/**
 * Single Generated Content API
 * GET /api/generate/[id] - Get content by ID
 * PUT /api/generate/[id] - Update content
 * DELETE /api/generate/[id] - Delete content
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getContentById, updateContent, deleteContent } from '@/lib/services/content.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================
// GET - Get Single Content
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

    const content = await getContentById(id, user.id)

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json({ content })
  } catch (error) {
    console.error('GET /api/generate/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - Update Content
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

    // Parse body
    const body = await request.json()
    const updates: { content?: string; title?: string; seoData?: Record<string, unknown> } = {}

    if (body.content !== undefined) updates.content = body.content
    if (body.title !== undefined) updates.title = body.title
    if (body.seoData !== undefined) updates.seoData = body.seoData

    const content = await updateContent(id, user.id, updates)

    return NextResponse.json({ content })
  } catch (error) {
    console.error('PUT /api/generate/[id] error:', error)

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
// DELETE - Delete Content
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

    await deleteContent(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/generate/[id] error:', error)

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
