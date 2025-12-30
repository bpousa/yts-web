/**
 * Webhook Trigger API
 * POST /api/webhooks/trigger - Trigger a webhook with real content
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerWebhookSchema } from '@/lib/utils/validators'
import {
  getWebhookById,
  executeWebhook,
  logWebhookExecution,
  buildPayload,
} from '@/lib/services/webhook.service'
import { getContentById } from '@/lib/services/content.service'

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
    const validationResult = triggerWebhookSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { webhookId, contentId } = validationResult.data

    // Get webhook
    const webhook = await getWebhookById(webhookId, user.id)

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    if (!webhook.enabled) {
      return NextResponse.json(
        { error: 'Webhook is disabled' },
        { status: 400 }
      )
    }

    // Get content
    const content = await getContentById(contentId, user.id)

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Prepare content data for webhook
    const contentData: Record<string, unknown> = {
      id: content.id,
      title: content.title,
      content: content.content,
      format: content.format,
      voice: content.voice,
      imageUrl: content.imageUrl,
      seoData: content.seoData,
      createdAt: content.createdAt,
    }

    // Build payload for logging
    const payload = buildPayload(
      webhook.payloadTemplate,
      webhook.fieldMappings,
      contentData
    )

    // Execute webhook
    const result = await executeWebhook(webhook, contentData)

    // Log the execution
    await logWebhookExecution(webhookId, contentId, result, payload)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Webhook triggered successfully',
        statusCode: result.statusCode,
        durationMs: result.durationMs,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        statusCode: result.statusCode,
        durationMs: result.durationMs,
      }, { status: 502 }) // Bad Gateway for upstream failures
    }
  } catch (error) {
    console.error('POST /api/webhooks/trigger error:', error)

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
