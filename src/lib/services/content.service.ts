/**
 * Content Generation Service
 * Combines transcript processing, tone profiles, and Claude for content generation
 */

import { generateContent, generateClaudeResponseStreaming, type StreamCallbacks } from './claude.service'
import { generateSingleImage } from './gemini.service'
import { getToneProfileById } from './tone.service'
import {
  buildContentPrompt,
  buildContentUserMessage,
  type ContentGenerationOptions,
} from '@/lib/prompts/content-generation'
import {
  buildImagePrompt,
  buildNegativePrompt,
  IMAGE_FROM_CONTENT_SYSTEM_PROMPT,
  buildContentToImageMessage,
  parseImageSuggestionResponse,
  type ImageStyle,
  type ImageMood,
  type AspectRatio,
} from '@/lib/prompts/image-generation'
import { createClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface GenerateContentInput {
  transcriptIds: string[]
  format: string
  voice: string
  toneProfileId?: string
  customInstructions?: string
  lengthConstraint?: {
    type: 'words' | 'paragraphs' | 'characters'
    value: number
  }
}

export interface GeneratedContent {
  id: string
  userId: string
  projectId?: string
  transcriptIds: string[]
  format: string
  voice: string
  content: string
  title?: string
  toneProfileId?: string
  seoData?: Record<string, unknown>
  imageUrl?: string
  createdAt: string
}

export interface GenerateImageInput {
  contentId: string
  style: ImageStyle
  mood: ImageMood
  customPrompt?: string
  aspectRatio: AspectRatio
}

// ============================================
// CONTENT GENERATION
// ============================================

/**
 * Generate content from transcripts
 */
export async function generateFromTranscripts(
  userId: string,
  input: GenerateContentInput
): Promise<GeneratedContent> {
  const supabase = await createClient()

  // Fetch transcripts
  const { data: transcripts, error: transcriptError } = await supabase
    .from('transcripts')
    .select('content')
    .in('id', input.transcriptIds)
    .eq('user_id', userId)

  if (transcriptError || !transcripts || transcripts.length === 0) {
    throw new Error('Failed to fetch transcripts')
  }

  const transcriptTexts = transcripts.map(t => t.content)

  // Get tone profile if specified
  let toneDna: string | undefined
  if (input.toneProfileId) {
    const toneProfile = await getToneProfileById(input.toneProfileId, userId)
    if (toneProfile) {
      toneDna = toneProfile.styleDna
    }
  }

  // Build prompts
  const systemPrompt = buildContentPrompt({
    format: input.format,
    voice: input.voice,
    toneDna,
    customInstructions: input.customInstructions,
    lengthConstraint: input.lengthConstraint,
  })

  const userMessage = buildContentUserMessage(transcriptTexts)

  // Generate content
  const generatedText = await generateContent(systemPrompt, userMessage, {
    temperature: 0.7,
    maxTokens: 4096,
  })

  // Extract title from content (first line or heading)
  const title = extractTitle(generatedText, input.format)

  // Save to database
  const { data: savedContent, error: saveError } = await supabase
    .from('generated_content')
    .insert({
      user_id: userId,
      transcript_ids: input.transcriptIds,
      format: input.format,
      voice: input.voice,
      content: generatedText,
      title,
      tone_profile_id: input.toneProfileId,
    })
    .select()
    .single()

  if (saveError) {
    throw new Error(`Failed to save content: ${saveError.message}`)
  }

  return mapDbToContent(savedContent)
}

/**
 * Generate content with streaming response
 */
export async function generateFromTranscriptsStreaming(
  userId: string,
  input: GenerateContentInput,
  callbacks: StreamCallbacks
): Promise<GeneratedContent> {
  const supabase = await createClient()

  // Fetch transcripts
  const { data: transcripts, error: transcriptError } = await supabase
    .from('transcripts')
    .select('content')
    .in('id', input.transcriptIds)
    .eq('user_id', userId)

  if (transcriptError || !transcripts || transcripts.length === 0) {
    throw new Error('Failed to fetch transcripts')
  }

  const transcriptTexts = transcripts.map(t => t.content)

  // Get tone profile if specified
  let toneDna: string | undefined
  if (input.toneProfileId) {
    const toneProfile = await getToneProfileById(input.toneProfileId, userId)
    if (toneProfile) {
      toneDna = toneProfile.styleDna
    }
  }

  // Build prompts
  const systemPrompt = buildContentPrompt({
    format: input.format,
    voice: input.voice,
    toneDna,
    customInstructions: input.customInstructions,
    lengthConstraint: input.lengthConstraint,
  })

  const userMessage = buildContentUserMessage(transcriptTexts)

  // Generate with streaming
  const response = await generateClaudeResponseStreaming(
    {
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.7,
      maxTokens: 4096,
    },
    callbacks
  )

  const generatedText = response.content
  const title = extractTitle(generatedText, input.format)

  // Save to database
  const { data: savedContent, error: saveError } = await supabase
    .from('generated_content')
    .insert({
      user_id: userId,
      transcript_ids: input.transcriptIds,
      format: input.format,
      voice: input.voice,
      content: generatedText,
      title,
      tone_profile_id: input.toneProfileId,
    })
    .select()
    .single()

  if (saveError) {
    throw new Error(`Failed to save content: ${saveError.message}`)
  }

  return mapDbToContent(savedContent)
}

// ============================================
// IMAGE GENERATION
// ============================================

/**
 * Generate an image for content
 */
export async function generateImageForContent(
  userId: string,
  input: GenerateImageInput
): Promise<string> {
  const supabase = await createClient()

  // Fetch the content
  const { data: content, error } = await supabase
    .from('generated_content')
    .select('content, format')
    .eq('id', input.contentId)
    .eq('user_id', userId)
    .single()

  if (error || !content) {
    throw new Error('Content not found')
  }

  let imagePrompt: string

  if (input.customPrompt) {
    // Use custom prompt directly
    imagePrompt = buildImagePrompt({
      subject: input.customPrompt,
      style: input.style,
      mood: input.mood,
      aspectRatio: input.aspectRatio,
    })
  } else {
    // Generate prompt from content
    const suggestionMessage = buildContentToImageMessage(content.content, content.format)
    const suggestionResponse = await generateContent(
      IMAGE_FROM_CONTENT_SYSTEM_PROMPT,
      suggestionMessage,
      { temperature: 0.7 }
    )

    const suggestion = parseImageSuggestionResponse(suggestionResponse)

    if (suggestion) {
      imagePrompt = buildImagePrompt({
        subject: `${suggestion.mainSubject}. ${suggestion.composition}`,
        style: input.style,
        mood: input.mood,
        aspectRatio: input.aspectRatio,
      })
    } else {
      // Fallback to simple prompt
      const title = extractTitle(content.content, content.format)
      imagePrompt = buildImagePrompt({
        subject: title || 'Professional content illustration',
        style: input.style,
        mood: input.mood,
        aspectRatio: input.aspectRatio,
      })
    }
  }

  // Generate the image
  const negativePrompt = buildNegativePrompt()
  const fullPrompt = `${imagePrompt}\n\nDO NOT include: ${negativePrompt}`

  const imageDataUrl = await generateSingleImage(fullPrompt, input.aspectRatio)

  // Update content with image URL
  await supabase
    .from('generated_content')
    .update({ image_url: imageDataUrl })
    .eq('id', input.contentId)

  return imageDataUrl
}

// ============================================
// CONTENT RETRIEVAL
// ============================================

/**
 * Get all content for a user
 */
export async function getContentList(
  userId: string,
  options?: { limit?: number; offset?: number; format?: string }
): Promise<GeneratedContent[]> {
  const supabase = await createClient()

  let query = supabase
    .from('generated_content')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (options?.format) {
    query = query.eq('format', options.format)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch content: ${error.message}`)
  }

  return data.map(mapDbToContent)
}

/**
 * Get a single content item
 */
export async function getContentById(
  id: string,
  userId: string
): Promise<GeneratedContent | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch content: ${error.message}`)
  }

  return mapDbToContent(data)
}

/**
 * Delete content
 */
export async function deleteContent(id: string, userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('generated_content')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete content: ${error.message}`)
  }
}

/**
 * Update content
 */
export async function updateContent(
  id: string,
  userId: string,
  updates: { content?: string; title?: string; seoData?: Record<string, unknown> }
): Promise<GeneratedContent> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.content !== undefined) updateData.content = updates.content
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.seoData !== undefined) updateData.seo_data = updates.seoData

  const { data, error } = await supabase
    .from('generated_content')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update content: ${error.message}`)
  }

  return mapDbToContent(data)
}

// ============================================
// HELPERS
// ============================================

function extractTitle(content: string, format: string): string {
  // For twitter, use first tweet
  if (format === 'twitter') {
    const firstLine = content.split('\n')[0]
    return firstLine.replace(/^1\/\s*/, '').substring(0, 100)
  }

  // Look for markdown heading
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) {
    return headingMatch[1].substring(0, 200)
  }

  // Use first line
  const firstLine = content.split('\n')[0].trim()
  return firstLine.substring(0, 200)
}

function mapDbToContent(row: Record<string, unknown>): GeneratedContent {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    projectId: row.project_id as string | undefined,
    transcriptIds: (row.transcript_ids as string[]) || [],
    format: row.format as string,
    voice: row.voice as string,
    content: row.content as string,
    title: row.title as string | undefined,
    toneProfileId: row.tone_profile_id as string | undefined,
    seoData: row.seo_data as Record<string, unknown> | undefined,
    imageUrl: row.image_url as string | undefined,
    createdAt: row.created_at as string,
  }
}
