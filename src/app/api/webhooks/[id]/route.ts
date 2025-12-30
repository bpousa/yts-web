/**
 * Single Webhook API
 * GET /api/webhooks/[id] - Get webhook by ID
 * PUT /api/webhooks/[id] - Update webhook
 * DELETE /api/webhooks/[id] - Delete webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateWebhookSchema } from '@/lib/utils/validators'
import {
  getWebhookById,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
} from '@/lib/services/webhook.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================
// GET - Get Single Webhook with Logs
// ============================================

export async function GET(
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

    const webhook = await getWebhookById(id, user.id)

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Get query params for logs
    const { searchParams } = new URL(request.url)
    const includeLogs = searchParams.get('includeLogs') === 'true'
    const logLimit = parseInt(searchParams.get('logLimit') || '20')

    let logs = undefined
    if (includeLogs) {
      logs = await getWebhookLogs(id, user.id, logLimit)
    }

    return NextResponse.json({ webhook, logs })
  } catch (error) {
    console.error('GET /api/webhooks/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - Update Webhook
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
    const validationResult = updateWebhookSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const webhook = await updateWebhook(id, user.id, validationResult.data)

    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('PUT /api/webhooks/[id] error:', error)

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
// DELETE - Delete Webhook
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

    await deleteWebhook(id, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/webhooks/[id] error:', error)

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
