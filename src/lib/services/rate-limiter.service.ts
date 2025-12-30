/**
 * Rate Limiter Service
 *
 * Provides rate limiting for API routes with two modes:
 * 1. In-memory rate limiting (default, works without external services)
 * 2. Upstash Redis rate limiting (optional, for production/distributed deployments)
 *
 * Configure Upstash by setting UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Rate limit configurations per endpoint type
const RATE_LIMITS = {
  // Transcript operations - relatively expensive
  transcripts: { requests: 20, window: '1m' as const },
  transcriptsBatch: { requests: 5, window: '1m' as const },

  // Content generation - expensive AI calls
  generate: { requests: 10, window: '1m' as const },
  generateImage: { requests: 5, window: '1m' as const },

  // YouTube search - uses API quota
  youtubeSearch: { requests: 30, window: '1m' as const },

  // Tone operations - moderate cost
  tones: { requests: 30, window: '1m' as const },
  tonesAnalyze: { requests: 10, window: '1m' as const },

  // SEO analysis - AI calls
  seo: { requests: 15, window: '1m' as const },

  // Webhooks - should be generous
  webhooks: { requests: 60, window: '1m' as const },
  webhooksTest: { requests: 10, window: '1m' as const },
  webhooksTrigger: { requests: 20, window: '1m' as const },

  // Default for unspecified routes
  default: { requests: 60, window: '1m' as const },
}

export type RateLimitType = keyof typeof RATE_LIMITS

// In-memory store for when Redis is not configured
const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Create Upstash rate limiter if configured
let upstashRateLimiters: Map<RateLimitType, Ratelimit> | null = null

function getUpstashRateLimiters(): Map<RateLimitType, Ratelimit> | null {
  if (upstashRateLimiters) return upstashRateLimiters

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    return null
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })

    upstashRateLimiters = new Map()

    for (const [type, config] of Object.entries(RATE_LIMITS)) {
      upstashRateLimiters.set(
        type as RateLimitType,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(config.requests, config.window),
          prefix: `ratelimit:${type}`,
        })
      )
    }

    return upstashRateLimiters
  } catch (error) {
    console.error('Failed to initialize Upstash Redis:', error)
    return null
  }
}

// In-memory rate limiting (fallback when Redis not configured)
function checkMemoryRateLimit(
  identifier: string,
  type: RateLimitType
): { success: boolean; remaining: number; reset: number } {
  const config = RATE_LIMITS[type]
  const windowMs = parseWindow(config.window)
  const key = `${type}:${identifier}`
  const now = Date.now()

  const entry = memoryStore.get(key)

  if (!entry || now >= entry.resetAt) {
    // First request or window expired
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: config.requests - 1, reset: now + windowMs }
  }

  if (entry.count >= config.requests) {
    // Rate limit exceeded
    return { success: false, remaining: 0, reset: entry.resetAt }
  }

  // Increment count
  entry.count++
  return { success: true, remaining: config.requests - entry.count, reset: entry.resetAt }
}

function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/)
  if (!match) return 60000 // Default 1 minute

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 60000
  }
}

// Cleanup old entries periodically (for memory store)
let lastCleanup = Date.now()
function cleanupMemoryStore() {
  const now = Date.now()
  if (now - lastCleanup < 60000) return // Only cleanup once per minute

  lastCleanup = now
  for (const [key, entry] of memoryStore.entries()) {
    if (now >= entry.resetAt) {
      memoryStore.delete(key)
    }
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

/**
 * Check rate limit for a given identifier and endpoint type
 *
 * @param identifier - Unique identifier (usually user ID or IP)
 * @param type - The type of rate limit to apply
 * @returns Rate limit result with success status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[type]

  // Try Upstash first if configured
  const upstashLimiters = getUpstashRateLimiters()

  if (upstashLimiters) {
    const limiter = upstashLimiters.get(type) || upstashLimiters.get('default')!
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: config.requests,
    }
  }

  // Fallback to in-memory rate limiting
  cleanupMemoryStore()
  const result = checkMemoryRateLimit(identifier, type)

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: config.requests,
  }
}

/**
 * Apply rate limit headers to a Response
 */
export function applyRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toString())
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitExceededResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.reset.toString(),
      },
    }
  )
}

/**
 * Get rate limit configuration (for displaying to users)
 */
export function getRateLimitConfig(type: RateLimitType) {
  return RATE_LIMITS[type]
}
