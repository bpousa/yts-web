/**
 * Webhook Test API
 * POST /api/webhooks/[id]/test - Test a webhook with sample data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getWebhookById,
  executeWebhook,
  buildPayload,
} from '@/lib/services/webhook.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
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

    // Get webhook
    const webhook = await getWebhookById(id, user.id)

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // Parse body for custom test data
    let testData: Record<string, unknown>
    try {
      const body = await request.json()
      testData = body.testData || {}
    } catch {
      testData = {}
    }

    // Create sample content data for testing
    const sampleContentData: Record<string, unknown> = {
      id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Content Title',
      content: 'This is a test content body. It demonstrates how your webhook payload will be structured when triggered with real content.',
      format: 'linkedin',
      voice: 'professional',
      excerpt: 'This is a test excerpt for the content.',
      createdAt: new Date().toISOString(),
      metadata: {
        wordCount: 25,
        readingTime: 1,
        isTest: true,
      },
      ...testData,
    }

    // Build the payload that will be sent
    const payload = buildPayload(
      webhook.payloadTemplate,
      webhook.fieldMappings,
      sampleContentData
    )

    // Execute the webhook
    const result = await executeWebhook(webhook, sampleContentData)

    return NextResponse.json({
      success: result.success,
      statusCode: result.statusCode,
      response: result.response,
      error: result.error,
      durationMs: result.durationMs,
      sentPayload: payload,
      message: result.success
        ? 'Webhook test successful!'
        : `Webhook test failed: ${result.error}`,
    })
  } catch (error) {
    console.error('POST /api/webhooks/[id]/test error:', error)

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
