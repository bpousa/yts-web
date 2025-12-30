/**
 * Webhook Service
 * Dynamic webhook configuration and execution system
 * Supports multiple destinations and authentication types
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

// ============================================
// TYPES
// ============================================

export type WebhookAuthType = 'none' | 'bearer' | 'api_key' | 'basic' | 'custom_header'
export type WebhookHttpMethod = 'POST' | 'PUT' | 'PATCH'

export interface WebhookAuthConfig {
  token?: string
  apiKey?: string
  headerName?: string
  headerValue?: string
  username?: string
  password?: string
}

export interface WebhookConfig {
  id: string
  userId: string
  name: string
  description?: string
  endpointUrl: string
  httpMethod: WebhookHttpMethod
  headers: Record<string, string>
  authType: WebhookAuthType
  authConfig: WebhookAuthConfig
  payloadTemplate: Record<string, unknown>
  fieldMappings: Record<string, string>
  enabled: boolean
  retryCount: number
  timeoutMs: number
  createdAt: string
  updatedAt: string
}

export interface WebhookLog {
  id: string
  webhookId: string
  contentId: string
  status: 'success' | 'failed' | 'pending'
  statusCode?: number
  requestPayload: Record<string, unknown>
  responseBody?: string
  errorMessage?: string
  executedAt: string
  durationMs?: number
}

export interface WebhookExecutionResult {
  success: boolean
  statusCode?: number
  response?: string
  error?: string
  durationMs: number
}

// ============================================
// PAYLOAD BUILDING
// ============================================

/**
 * Build webhook payload from template and content data
 */
export function buildPayload(
  template: Record<string, unknown>,
  fieldMappings: Record<string, string>,
  contentData: Record<string, unknown>
): Record<string, unknown> {
  const payload = JSON.parse(JSON.stringify(template)) // Deep clone

  // Apply field mappings
  for (const [payloadField, contentField] of Object.entries(fieldMappings)) {
    const value = getNestedValue(contentData, contentField)
    setNestedValue(payload, payloadField, value)
  }

  return payload
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!

  let current = obj
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[lastKey] = value
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Build authentication headers based on auth type
 */
export function buildAuthHeaders(
  authType: WebhookAuthType,
  authConfig: WebhookAuthConfig
): Record<string, string> {
  switch (authType) {
    case 'bearer':
      if (!authConfig.token) return {}
      return { Authorization: `Bearer ${authConfig.token}` }

    case 'api_key':
      if (!authConfig.headerName || !authConfig.apiKey) return {}
      return { [authConfig.headerName]: authConfig.apiKey }

    case 'basic':
      if (!authConfig.username || !authConfig.password) return {}
      const credentials = Buffer.from(
        `${authConfig.username}:${authConfig.password}`
      ).toString('base64')
      return { Authorization: `Basic ${credentials}` }

    case 'custom_header':
      if (!authConfig.headerName || !authConfig.headerValue) return {}
      return { [authConfig.headerName]: authConfig.headerValue }

    default:
      return {}
  }
}

// ============================================
// WEBHOOK EXECUTION
// ============================================

/**
 * Execute a webhook with retry logic
 */
export async function executeWebhook(
  config: WebhookConfig,
  contentData: Record<string, unknown>
): Promise<WebhookExecutionResult> {
  const startTime = Date.now()

  // Build payload
  const payload = buildPayload(config.payloadTemplate, config.fieldMappings, contentData)

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
    ...buildAuthHeaders(config.authType, config.authConfig),
  }

  let lastError: string | undefined
  let statusCode: number | undefined
  let responseBody: string | undefined

  // Retry loop
  for (let attempt = 0; attempt <= config.retryCount; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)

      const response = await fetch(config.endpointUrl, {
        method: config.httpMethod,
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      statusCode = response.status
      responseBody = await response.text()

      if (response.ok) {
        return {
          success: true,
          statusCode,
          response: responseBody,
          durationMs: Date.now() - startTime,
        }
      }

      lastError = `HTTP ${statusCode}: ${responseBody.substring(0, 200)}`
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = `Request timeout after ${config.timeoutMs}ms`
        } else {
          lastError = error.message
        }
      } else {
        lastError = 'Unknown error'
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < config.retryCount) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  return {
    success: false,
    statusCode,
    response: responseBody,
    error: lastError,
    durationMs: Date.now() - startTime,
  }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Get all webhooks for a user
 */
export async function getWebhooks(userId: string): Promise<WebhookConfig[]> {
  const supabase = await createClient() as AnySupabase

  const { data, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch webhooks: ${error.message}`)
  }

  return data.map(mapDbToWebhook)
}

/**
 * Get a single webhook by ID
 */
export async function getWebhookById(
  id: string,
  userId: string
): Promise<WebhookConfig | null> {
  const supabase = await createClient() as AnySupabase

  const { data, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch webhook: ${error.message}`)
  }

  return mapDbToWebhook(data)
}

/**
 * Create a new webhook
 */
export async function createWebhook(
  userId: string,
  input: Omit<WebhookConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<WebhookConfig> {
  const supabase = await createClient() as AnySupabase as AnySupabase

  const { data, error } = await supabase
    .from('webhook_configs')
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description,
      endpoint_url: input.endpointUrl,
      http_method: input.httpMethod,
      headers: input.headers,
      auth_type: input.authType,
      auth_config: input.authConfig,
      payload_template: input.payloadTemplate,
      field_mappings: input.fieldMappings,
      enabled: input.enabled,
      retry_count: input.retryCount,
      timeout_ms: input.timeoutMs,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create webhook: ${error.message}`)
  }

  return mapDbToWebhook(data)
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  id: string,
  userId: string,
  updates: Partial<Omit<WebhookConfig, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<WebhookConfig> {
  const supabase = await createClient() as AnySupabase as AnySupabase

  const updateData: Record<string, unknown> = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.endpointUrl !== undefined) updateData.endpoint_url = updates.endpointUrl
  if (updates.httpMethod !== undefined) updateData.http_method = updates.httpMethod
  if (updates.headers !== undefined) updateData.headers = updates.headers
  if (updates.authType !== undefined) updateData.auth_type = updates.authType
  if (updates.authConfig !== undefined) updateData.auth_config = updates.authConfig
  if (updates.payloadTemplate !== undefined) updateData.payload_template = updates.payloadTemplate
  if (updates.fieldMappings !== undefined) updateData.field_mappings = updates.fieldMappings
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled
  if (updates.retryCount !== undefined) updateData.retry_count = updates.retryCount
  if (updates.timeoutMs !== undefined) updateData.timeout_ms = updates.timeoutMs

  const { data, error } = await supabase
    .from('webhook_configs')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update webhook: ${error.message}`)
  }

  return mapDbToWebhook(data)
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string, userId: string): Promise<void> {
  const supabase = await createClient() as AnySupabase

  const { error } = await supabase
    .from('webhook_configs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete webhook: ${error.message}`)
  }
}

// ============================================
// WEBHOOK LOGGING
// ============================================

/**
 * Log a webhook execution
 */
export async function logWebhookExecution(
  webhookId: string,
  contentId: string,
  result: WebhookExecutionResult,
  requestPayload: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient() as AnySupabase

  await supabase.from('webhook_logs').insert({
    webhook_id: webhookId,
    content_id: contentId,
    status: result.success ? 'success' : 'failed',
    status_code: result.statusCode,
    request_payload: requestPayload,
    response_body: result.response?.substring(0, 10000),
    error_message: result.error,
    duration_ms: result.durationMs,
  })
}

/**
 * Get logs for a webhook
 */
export async function getWebhookLogs(
  webhookId: string,
  userId: string,
  limit: number = 50
): Promise<WebhookLog[]> {
  const supabase = await createClient() as AnySupabase

  // First verify user owns the webhook
  const { data: webhook } = await supabase
    .from('webhook_configs')
    .select('id')
    .eq('id', webhookId)
    .eq('user_id', userId)
    .single()

  if (!webhook) {
    throw new Error('Webhook not found')
  }

  const { data, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('executed_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch webhook logs: ${error.message}`)
  }

  return data.map(mapDbToWebhookLog)
}

// ============================================
// HELPERS
// ============================================

function mapDbToWebhook(row: Record<string, unknown>): WebhookConfig {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    endpointUrl: row.endpoint_url as string,
    httpMethod: row.http_method as WebhookHttpMethod,
    headers: (row.headers as Record<string, string>) || {},
    authType: row.auth_type as WebhookAuthType,
    authConfig: (row.auth_config as WebhookAuthConfig) || {},
    payloadTemplate: (row.payload_template as Record<string, unknown>) || {},
    fieldMappings: (row.field_mappings as Record<string, string>) || {},
    enabled: row.enabled as boolean,
    retryCount: row.retry_count as number,
    timeoutMs: row.timeout_ms as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function mapDbToWebhookLog(row: Record<string, unknown>): WebhookLog {
  return {
    id: row.id as string,
    webhookId: row.webhook_id as string,
    contentId: row.content_id as string,
    status: row.status as 'success' | 'failed' | 'pending',
    statusCode: row.status_code as number | undefined,
    requestPayload: (row.request_payload as Record<string, unknown>) || {},
    responseBody: row.response_body as string | undefined,
    errorMessage: row.error_message as string | undefined,
    executedAt: row.executed_at as string,
    durationMs: row.duration_ms as number | undefined,
  }
}

// ============================================
// WEBHOOK TEMPLATES
// ============================================

export const WEBHOOK_TEMPLATES = {
  wordpress: {
    name: 'WordPress REST API',
    description: 'Post content to WordPress as a draft',
    endpointUrl: 'https://your-site.com/wp-json/wp/v2/posts',
    httpMethod: 'POST' as WebhookHttpMethod,
    authType: 'bearer' as WebhookAuthType,
    payloadTemplate: {
      title: '',
      content: '',
      status: 'draft',
      excerpt: '',
    },
    fieldMappings: {
      title: 'title',
      content: 'content',
      excerpt: 'excerpt',
    },
  },
  zapier: {
    name: 'Zapier Webhook',
    description: 'Send content to Zapier for automation',
    endpointUrl: 'https://hooks.zapier.com/hooks/catch/...',
    httpMethod: 'POST' as WebhookHttpMethod,
    authType: 'none' as WebhookAuthType,
    payloadTemplate: {
      content: '',
      title: '',
      format: '',
      createdAt: '',
    },
    fieldMappings: {
      content: 'content',
      title: 'title',
      format: 'format',
      createdAt: 'createdAt',
    },
  },
  make: {
    name: 'Make (Integromat) Webhook',
    description: 'Send content to Make scenarios',
    endpointUrl: 'https://hook.make.com/...',
    httpMethod: 'POST' as WebhookHttpMethod,
    authType: 'none' as WebhookAuthType,
    payloadTemplate: {
      data: {
        content: '',
        metadata: {},
      },
    },
    fieldMappings: {
      'data.content': 'content',
      'data.metadata': 'metadata',
    },
  },
  n8n: {
    name: 'N8N Webhook',
    description: 'Send content to N8N workflows',
    endpointUrl: 'https://your-n8n.com/webhook/...',
    httpMethod: 'POST' as WebhookHttpMethod,
    authType: 'none' as WebhookAuthType,
    payloadTemplate: {
      content: '',
      source: 'yts-web',
    },
    fieldMappings: {
      content: 'content',
    },
  },
  notion: {
    name: 'Notion API',
    description: 'Create pages in Notion database',
    endpointUrl: 'https://api.notion.com/v1/pages',
    httpMethod: 'POST' as WebhookHttpMethod,
    authType: 'bearer' as WebhookAuthType,
    headers: {
      'Notion-Version': '2022-06-28',
    },
    payloadTemplate: {
      parent: { database_id: '' },
      properties: {
        Name: { title: [{ text: { content: '' } }] },
      },
      children: [],
    },
    fieldMappings: {
      'properties.Name.title.0.text.content': 'title',
    },
  },
  custom: {
    name: 'Custom JSON Webhook',
    description: 'Fully customizable webhook',
    endpointUrl: '',
    httpMethod: 'POST' as WebhookHttpMethod,
    authType: 'none' as WebhookAuthType,
    payloadTemplate: {},
    fieldMappings: {},
  },
} as const

export type WebhookTemplateKey = keyof typeof WEBHOOK_TEMPLATES
