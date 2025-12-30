/**
 * Webhooks API
 * GET /api/webhooks - List user's webhooks
 * POST /api/webhooks - Create new webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createWebhookSchema } from '@/lib/utils/validators'
import { getWebhooks, createWebhook, WEBHOOK_TEMPLATES } from '@/lib/services/webhook.service'

// ============================================
// GET - List Webhooks
// ============================================

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhooks = await getWebhooks(user.id)

    return NextResponse.json({
      webhooks,
      templates: Object.entries(WEBHOOK_TEMPLATES).map(([key, template]) => ({
        id: key,
        name: template.name,
        description: template.description,
      })),
    })
  } catch (error) {
    console.error('GET /api/webhooks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - Create Webhook
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

    // If using a template, merge template with body
    if (body.templateId && body.templateId in WEBHOOK_TEMPLATES) {
      const template = WEBHOOK_TEMPLATES[body.templateId as keyof typeof WEBHOOK_TEMPLATES]
      body.httpMethod = body.httpMethod || template.httpMethod
      body.authType = body.authType || template.authType
      body.payloadTemplate = body.payloadTemplate || template.payloadTemplate
      body.fieldMappings = body.fieldMappings || template.fieldMappings
      if ('headers' in template) {
        body.headers = { ...template.headers, ...body.headers }
      }
    }

    const validationResult = createWebhookSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const webhook = await createWebhook(user.id, validationResult.data)

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('POST /api/webhooks error:', error)

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
