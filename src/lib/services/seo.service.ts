/**
 * SEO Service
 * Generates SEO metadata and analyzes content for search optimization
 */

import { generateContent } from './claude.service'
import {
  SEO_SYSTEM_PROMPT,
  buildSEOUserMessage,
  parseSEOResponse,
  calculateReadabilityScore,
  type SEOAnalysisResult,
} from '@/lib/prompts/seo-analysis'

// ============================================
// TYPES
// ============================================

export interface SEOAnalysisInput {
  content: string
  targetKeyword?: string
  contentType?: string
}

export interface FullSEOAnalysis extends SEOAnalysisResult {
  clientReadability: {
    score: number
    level: string
    stats: {
      wordCount: number
      sentenceCount: number
      syllableCount: number
      avgWordsPerSentence: number
      avgSyllablesPerWord: number
    }
  }
}

// ============================================
// SEO ANALYSIS
// ============================================

/**
 * Generate complete SEO analysis for content
 */
export async function analyzeSEO(input: SEOAnalysisInput): Promise<FullSEOAnalysis> {
  // Calculate client-side readability first
  const clientReadability = calculateReadabilityScore(input.content)

  // Generate AI-powered SEO analysis
  const userMessage = buildSEOUserMessage(input.content, input.targetKeyword)

  const response = await generateContent(SEO_SYSTEM_PROMPT, userMessage, {
    temperature: 0.3, // Lower temperature for more consistent output
  })

  const seoResult = parseSEOResponse(response)

  if (!seoResult) {
    throw new Error('Failed to parse SEO analysis response')
  }

  return {
    ...seoResult,
    clientReadability,
  }
}

// ============================================
// QUICK SEO HELPERS
// ============================================

/**
 * Generate just the meta title and description
 */
export async function generateMetaTags(
  content: string,
  targetKeyword?: string
): Promise<{ title: string; description: string }> {
  const prompt = `Generate an SEO-optimized meta title (50-60 chars) and meta description (150-160 chars) for this content:

${content.substring(0, 1500)}

${targetKeyword ? `Primary keyword: ${targetKeyword}` : ''}

Return as JSON: {"title": "...", "description": "..."}`

  const response = await generateContent(
    'You are an SEO expert. Return only valid JSON.',
    prompt,
    { temperature: 0.3 }
  )

  try {
    const parsed = JSON.parse(response.replace(/```json?\n?|\n?```/g, '').trim())
    return {
      title: parsed.title || '',
      description: parsed.description || '',
    }
  } catch {
    throw new Error('Failed to generate meta tags')
  }
}

/**
 * Extract keywords from content
 */
export async function extractKeywords(content: string, count: number = 10): Promise<string[]> {
  const prompt = `Extract the ${count} most relevant SEO keywords/phrases from this content:

${content.substring(0, 2000)}

Return as JSON array: ["keyword1", "keyword2", ...]`

  const response = await generateContent(
    'You are an SEO keyword expert. Return only valid JSON array.',
    prompt,
    { temperature: 0.3 }
  )

  try {
    const parsed = JSON.parse(response.replace(/```json?\n?|\n?```/g, '').trim())
    return Array.isArray(parsed) ? parsed.slice(0, count) : []
  } catch {
    return []
  }
}

// ============================================
// READABILITY HELPERS
// ============================================

/**
 * Get readability score without AI (fast, client-side)
 */
export function getReadabilityScore(content: string) {
  return calculateReadabilityScore(content)
}

/**
 * Suggest improvements for readability
 */
export async function suggestReadabilityImprovements(
  content: string
): Promise<string[]> {
  const readability = calculateReadabilityScore(content)

  const prompt = `Analyze this content and suggest 3-5 specific improvements to make it more readable.

Current stats:
- Readability Score: ${readability.score} (${readability.level})
- Average words per sentence: ${readability.stats.avgWordsPerSentence}
- Average syllables per word: ${readability.stats.avgSyllablesPerWord}

Content:
${content.substring(0, 1500)}

Return as JSON array of improvement suggestions: ["suggestion1", "suggestion2", ...]`

  const response = await generateContent(
    'You are a writing clarity expert. Return only valid JSON array.',
    prompt,
    { temperature: 0.5 }
  )

  try {
    const parsed = JSON.parse(response.replace(/```json?\n?|\n?```/g, '').trim())
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ============================================
// CONTENT SCORING
// ============================================

export interface ContentScore {
  overall: number
  categories: {
    readability: number
    seoOptimization: number
    engagement: number
    structure: number
  }
  strengths: string[]
  improvements: string[]
}

/**
 * Score content across multiple dimensions
 */
export async function scoreContent(content: string): Promise<ContentScore> {
  const readability = calculateReadabilityScore(content)

  const prompt = `Score this content on a scale of 0-100 across these dimensions:
1. SEO Optimization (keyword usage, meta-friendliness)
2. Engagement (hook, flow, call-to-action)
3. Structure (headings, paragraphs, scanability)

Also list 2-3 strengths and 2-3 areas for improvement.

Content:
${content.substring(0, 2000)}

Return as JSON:
{
  "seoOptimization": 0-100,
  "engagement": 0-100,
  "structure": 0-100,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}`

  const response = await generateContent(
    'You are a content quality analyst. Return only valid JSON.',
    prompt,
    { temperature: 0.3 }
  )

  try {
    const parsed = JSON.parse(response.replace(/```json?\n?|\n?```/g, '').trim())

    const categories = {
      readability: readability.score,
      seoOptimization: Number(parsed.seoOptimization) || 50,
      engagement: Number(parsed.engagement) || 50,
      structure: Number(parsed.structure) || 50,
    }

    const overall = Math.round(
      (categories.readability +
        categories.seoOptimization +
        categories.engagement +
        categories.structure) /
        4
    )

    return {
      overall,
      categories,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
    }
  } catch {
    // Return basic score based on readability
    return {
      overall: readability.score,
      categories: {
        readability: readability.score,
        seoOptimization: 50,
        engagement: 50,
        structure: 50,
      },
      strengths: [],
      improvements: [],
    }
  }
}
