/**
 * Tone Profile Service
 * Analyzes writing samples and manages tone profiles for voice cloning
 * Ported from: /mnt/c/Projects/yts/pages/Settings.py
 */

import { generateContent } from './claude.service'
import { scrapeUrlContent } from '@/lib/utils/scraper'
import {
  TONE_ANALYSIS_SYSTEM_PROMPT,
  TONE_COMPARISON_SYSTEM_PROMPT,
  buildToneAnalysisMessage,
  buildToneRefinementMessage,
  buildToneComparisonMessage,
  parseToneComparisonResponse,
  validateSampleLength,
  type ToneComparisonResult,
} from '@/lib/prompts/tone-analysis'
import { createClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface ToneProfile {
  id: string
  userId: string
  name: string
  styleDna: string
  sampleText?: string
  sourceUrl?: string
  createdAt: string
  updatedAt: string
}

export interface AnalyzeToneInput {
  sampleText?: string
  sourceUrl?: string
  name?: string
}

// ============================================
// TONE ANALYSIS
// ============================================

/**
 * Analyze a writing sample and extract Style DNA
 */
export async function analyzeTone(input: AnalyzeToneInput): Promise<string> {
  let sampleText = input.sampleText

  // If URL provided, scrape the content
  if (input.sourceUrl && !sampleText) {
    sampleText = await scrapeUrlContent(input.sourceUrl)
  }

  if (!sampleText) {
    throw new Error('Either sampleText or sourceUrl must be provided')
  }

  // Validate sample length
  const validation = validateSampleLength(sampleText)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  // Generate Style DNA
  const userMessage = buildToneAnalysisMessage(sampleText, input.name)

  const styleDna = await generateContent(TONE_ANALYSIS_SYSTEM_PROMPT, userMessage, {
    temperature: 0.5,
    maxTokens: 2000,
  })

  return styleDna
}

/**
 * Refine an existing Style DNA with additional samples
 */
export async function refineTone(
  existingStyleDna: string,
  newSampleText: string
): Promise<string> {
  const validation = validateSampleLength(newSampleText)
  if (!validation.valid) {
    throw new Error(validation.message)
  }

  const userMessage = buildToneRefinementMessage(existingStyleDna, newSampleText)

  const refinedDna = await generateContent(TONE_ANALYSIS_SYSTEM_PROMPT, userMessage, {
    temperature: 0.5,
    maxTokens: 2000,
  })

  return refinedDna
}

/**
 * Compare generated content against a Style DNA profile
 */
export async function compareTone(
  styleDna: string,
  generatedContent: string
): Promise<ToneComparisonResult> {
  const userMessage = buildToneComparisonMessage(styleDna, generatedContent)

  const response = await generateContent(TONE_COMPARISON_SYSTEM_PROMPT, userMessage, {
    temperature: 0.3,
  })

  const result = parseToneComparisonResponse(response)

  if (!result) {
    throw new Error('Failed to parse tone comparison response')
  }

  return result
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Get all tone profiles for a user
 */
export async function getToneProfiles(userId: string): Promise<ToneProfile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tone_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch tone profiles: ${error.message}`)
  }

  return data.map(mapDbToToneProfile)
}

/**
 * Get a single tone profile by ID
 */
export async function getToneProfileById(
  id: string,
  userId: string
): Promise<ToneProfile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tone_profiles')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw new Error(`Failed to fetch tone profile: ${error.message}`)
  }

  return mapDbToToneProfile(data)
}

/**
 * Create a new tone profile
 */
export async function createToneProfile(
  userId: string,
  input: { name: string; styleDna: string; sampleText?: string; sourceUrl?: string }
): Promise<ToneProfile> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tone_profiles')
    .insert({
      user_id: userId,
      name: input.name,
      style_dna: input.styleDna,
      sample_text: input.sampleText,
      source_url: input.sourceUrl,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create tone profile: ${error.message}`)
  }

  return mapDbToToneProfile(data)
}

/**
 * Update an existing tone profile
 */
export async function updateToneProfile(
  id: string,
  userId: string,
  updates: { name?: string; styleDna?: string }
): Promise<ToneProfile> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (updates.name) updateData.name = updates.name
  if (updates.styleDna) updateData.style_dna = updates.styleDna

  const { data, error } = await supabase
    .from('tone_profiles')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update tone profile: ${error.message}`)
  }

  return mapDbToToneProfile(data)
}

/**
 * Delete a tone profile
 */
export async function deleteToneProfile(id: string, userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tone_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete tone profile: ${error.message}`)
  }
}

// ============================================
// HELPERS
// ============================================

function mapDbToToneProfile(row: Record<string, unknown>): ToneProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    styleDna: row.style_dna as string,
    sampleText: row.sample_text as string | undefined,
    sourceUrl: row.source_url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ============================================
// QUICK TONE DETECTION
// ============================================

export interface QuickToneAnalysis {
  formality: 'casual' | 'conversational' | 'professional' | 'formal' | 'academic'
  energy: 'calm' | 'measured' | 'energetic' | 'intense'
  warmth: 'distant' | 'neutral' | 'friendly' | 'warm'
  authority: 'humble' | 'peer' | 'confident' | 'authoritative'
  summary: string
}

/**
 * Quick tone detection without full DNA extraction
 */
export async function detectToneQuick(text: string): Promise<QuickToneAnalysis> {
  const prompt = `Quickly analyze the tone of this text and classify it:

${text.substring(0, 1000)}

Return as JSON:
{
  "formality": "casual|conversational|professional|formal|academic",
  "energy": "calm|measured|energetic|intense",
  "warmth": "distant|neutral|friendly|warm",
  "authority": "humble|peer|confident|authoritative",
  "summary": "One sentence description of the overall tone"
}`

  const response = await generateContent(
    'You are a writing tone analyst. Return only valid JSON.',
    prompt,
    { temperature: 0.3 }
  )

  try {
    const parsed = JSON.parse(response.replace(/```json?\n?|\n?```/g, '').trim())
    return {
      formality: parsed.formality || 'professional',
      energy: parsed.energy || 'measured',
      warmth: parsed.warmth || 'neutral',
      authority: parsed.authority || 'confident',
      summary: parsed.summary || '',
    }
  } catch {
    return {
      formality: 'professional',
      energy: 'measured',
      warmth: 'neutral',
      authority: 'confident',
      summary: 'Unable to analyze tone',
    }
  }
}
