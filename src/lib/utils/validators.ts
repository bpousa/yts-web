/**
 * Zod validation schemas for all API inputs
 */

import { z } from 'zod'

// Install zod if not present: npm install zod

// ============================================
// Transcript Validators
// ============================================

export const fetchTranscriptSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  includeTimestamps: z.boolean().default(false),
  enableFallback: z.boolean().default(true),
  projectName: z.string().optional(),
})

export const batchFetchTranscriptSchema = z.object({
  urls: z.array(z.string().min(1)).min(1, 'At least one URL is required').max(50, 'Maximum 50 URLs'),
  includeTimestamps: z.boolean().default(false),
  enableFallback: z.boolean().default(true),
  projectName: z.string().optional(),
})

export type FetchTranscriptInput = z.infer<typeof fetchTranscriptSchema>
export type BatchFetchTranscriptInput = z.infer<typeof batchFetchTranscriptSchema>

// ============================================
// YouTube Search Validators
// ============================================

export const youtubeSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500),
  maxResults: z.number().int().min(1).max(50).default(10),
  order: z.enum(['relevance', 'date', 'rating', 'viewCount', 'title']).default('relevance'),
  videoDuration: z.enum(['any', 'short', 'medium', 'long']).default('any'),
  publishedAfter: z.enum(['any', 'day', 'week', 'month', 'year']).default('any'),
})

export type YouTubeSearchInput = z.infer<typeof youtubeSearchSchema>

// ============================================
// Content Generation Validators
// ============================================

export const contentFormatSchema = z.enum([
  'linkedin',
  'twitter',
  'blog-short',
  'blog-long',
  'newsletter',
  'youtube-script',
  'youtube-short',
  'tiktok',
  'instagram-reel',
  'explainer-video',
])

export const voiceStyleSchema = z.enum([
  'professional',
  'casual',
  'humorous',
  'empathetic',
  'direct',
  'custom',
])

export const generateContentSchema = z.object({
  transcriptIds: z.array(z.string().uuid()).min(1).max(3, 'Maximum 3 transcripts'),
  format: contentFormatSchema,
  voice: voiceStyleSchema,
  toneProfileId: z.string().uuid().optional(),
  customInstructions: z.string().max(2000).optional(),
  lengthConstraint: z
    .object({
      type: z.enum(['words', 'paragraphs', 'characters']),
      value: z.number().int().positive(),
    })
    .optional(),
})

export type GenerateContentInput = z.infer<typeof generateContentSchema>

// ============================================
// Image Generation Validators
// ============================================

export const imageStyleSchema = z.enum([
  'photorealistic',
  'cartoon',
  'infographic',
  '3d-render',
  'minimalist',
  'hand-drawn',
  'cyberpunk',
  'oil-painting',
  'corporate-tech',
])

export const imageMoodSchema = z.enum([
  'professional',
  'vibrant',
  'dark-moody',
  'soft-light',
  'futuristic',
])

export const generateImageSchema = z.object({
  contentId: z.string().uuid(),
  style: imageStyleSchema.default('photorealistic'),
  mood: imageMoodSchema.default('professional'),
  customPrompt: z.string().max(500).optional(),
  aspectRatio: z.enum(['16:9', '1:1', '9:16']).default('16:9'),
})

export type GenerateImageInput = z.infer<typeof generateImageSchema>

// ============================================
// SEO Analysis Validators
// ============================================

export const seoAnalysisSchema = z.object({
  contentId: z.string().uuid(),
  content: z.string().min(100, 'Content must be at least 100 characters'),
})

export type SEOAnalysisInput = z.infer<typeof seoAnalysisSchema>

// ============================================
// Tone Profile Validators
// ============================================

export const analyzeToneSchema = z.object({
  sampleText: z.string().min(200, 'Sample must be at least 200 characters').max(10000).optional(),
  sourceUrl: z.string().url().optional(),
}).refine(
  (data) => data.sampleText || data.sourceUrl,
  { message: 'Either sampleText or sourceUrl is required' }
)

export const createToneProfileSchema = z.object({
  name: z.string().min(1).max(100),
  styleDna: z.string().min(50),
  sampleText: z.string().optional(),
  sourceUrl: z.string().url().optional(),
})

export const updateToneProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  styleDna: z.string().min(50).optional(),
})

export type AnalyzeToneInput = z.infer<typeof analyzeToneSchema>
export type CreateToneProfileInput = z.infer<typeof createToneProfileSchema>
export type UpdateToneProfileInput = z.infer<typeof updateToneProfileSchema>

// ============================================
// Webhook Validators
// ============================================

export const webhookAuthTypeSchema = z.enum(['none', 'bearer', 'api_key', 'basic', 'custom_header'])

export const webhookAuthConfigSchema = z.object({
  token: z.string().optional(),
  apiKey: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
})

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  endpointUrl: z.string().url(),
  httpMethod: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string(), z.string()).default({}),
  authType: webhookAuthTypeSchema.default('none'),
  authConfig: webhookAuthConfigSchema.default({}),
  payloadTemplate: z.record(z.string(), z.unknown()),
  fieldMappings: z.record(z.string(), z.string()),
  enabled: z.boolean().default(true),
  retryCount: z.number().int().min(0).max(5).default(3),
  timeoutMs: z.number().int().min(1000).max(60000).default(30000),
})

export const updateWebhookSchema = createWebhookSchema.partial()

export const triggerWebhookSchema = z.object({
  webhookId: z.string().uuid(),
  contentId: z.string().uuid(),
})

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>
export type TriggerWebhookInput = z.infer<typeof triggerWebhookSchema>

// ============================================
// Common Validators
// ============================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export const uuidSchema = z.string().uuid()

export type PaginationInput = z.infer<typeof paginationSchema>
