/**
 * Tone Analysis Prompts
 * Ported from: /mnt/c/Projects/yts/pages/Settings.py
 *
 * Extracts "Style DNA" from writing samples to enable voice cloning
 */

// ============================================
// TONE ANALYSIS SYSTEM PROMPT
// ============================================

export const TONE_ANALYSIS_SYSTEM_PROMPT = `You are a master literary analyst and writing coach. Your specialty is deconstructing an author's unique voice and creating a detailed "Style DNA" profile that can be used to replicate their writing style.

## YOUR TASK
Analyze the provided writing sample and extract the author's distinctive stylistic patterns across four key dimensions.

## OUTPUT FORMAT
Return a detailed Style DNA profile in the following format:

---
## STYLE DNA PROFILE

### 1. Voice & Tone
[Describe the overall personality that comes through in the writing. Is it authoritative, conversational, irreverent, warm, clinical? What emotional undertone is present? How does the author position themselves relative to the reader?]

### 2. Sentence Structure
[Analyze sentence patterns. Average sentence length? Mix of simple/compound/complex? Use of fragments? Rhythm and flow? Opening patterns? Transitions?]

### 3. Vocabulary & Language
[Document vocabulary preferences. Formal vs informal register? Industry jargon vs accessible language? Power words? Unique phrases or expressions? Contractions? Slang?]

### 4. Rhythm & Pacing
[Describe the overall tempo. Fast-paced with short punchy sentences? Flowing with longer passages? Use of paragraph breaks? White space philosophy? How does the author build and release tension?]

---

## ANALYSIS GUIDELINES

Be SPECIFIC and ACTIONABLE. Instead of saying "uses varied sentence structure," say "alternates between 3-5 word punchy sentences and 15-20 word flowing explanations, rarely exceeding 25 words."

Include DIRECT EXAMPLES from the sample text to illustrate each pattern.

Note any DISTINCTIVE QUIRKS or signature moves (e.g., "starts 30% of paragraphs with a single-word sentence," "ends sections with a provocative question").

Identify WORDS/PHRASES TO MIMIC and WORDS/PHRASES TO AVOID based on the author's style.

The goal is to create a profile so detailed that another writer could authentically replicate this voice.
`

// ============================================
// TONE ANALYSIS USER MESSAGE
// ============================================

export function buildToneAnalysisMessage(sampleText: string, authorName?: string): string {
  let message = 'Analyze the following writing sample and extract the Style DNA profile:\n\n'

  if (authorName) {
    message += `Author: ${authorName}\n\n`
  }

  message += `---\n${sampleText}\n---\n\n`
  message += 'Create a comprehensive Style DNA profile following the specified format.'

  return message
}

// ============================================
// TONE PROFILE REFINEMENT PROMPT
// ============================================

export const TONE_REFINEMENT_PROMPT = `You are refining an existing Style DNA profile based on additional writing samples.

## YOUR TASK
Compare the new sample against the existing profile and:
1. Confirm patterns that remain consistent
2. Note any new patterns discovered
3. Refine descriptions to be more precise
4. Add new examples from the fresh sample

## EXISTING PROFILE
{existingProfile}

## NEW SAMPLE
{newSample}

## OUTPUT
Provide an updated, more comprehensive Style DNA profile that incorporates insights from all samples analyzed.
`

export function buildToneRefinementMessage(
  existingProfile: string,
  newSample: string
): string {
  return TONE_REFINEMENT_PROMPT
    .replace('{existingProfile}', existingProfile)
    .replace('{newSample}', newSample)
}

// ============================================
// TONE COMPARISON PROMPT
// ============================================

export const TONE_COMPARISON_SYSTEM_PROMPT = `You are a writing style analyst. Compare generated content against a Style DNA profile to assess how well it matches the target voice.

## OUTPUT FORMAT
Return a JSON object:
{
  "overallMatch": 0-100,
  "dimensionScores": {
    "voiceTone": 0-100,
    "sentenceStructure": 0-100,
    "vocabulary": 0-100,
    "rhythmPacing": 0-100
  },
  "matches": ["What the content does well..."],
  "mismatches": ["Where the content deviates..."],
  "suggestions": ["How to improve the match..."]
}
`

export function buildToneComparisonMessage(
  styleDna: string,
  generatedContent: string
): string {
  return `Compare this generated content against the Style DNA profile:

## STYLE DNA PROFILE
${styleDna}

## GENERATED CONTENT
${generatedContent}

## TASK
Analyze how well the generated content matches the target voice. Return your analysis as a valid JSON object.`
}

// ============================================
// QUICK TONE DESCRIPTORS
// ============================================

export const TONE_DESCRIPTORS = {
  formality: ['Casual', 'Conversational', 'Professional', 'Formal', 'Academic'],
  energy: ['Calm', 'Measured', 'Energetic', 'Intense', 'Urgent'],
  warmth: ['Distant', 'Neutral', 'Friendly', 'Warm', 'Intimate'],
  authority: ['Humble', 'Peer-level', 'Confident', 'Authoritative', 'Expert'],
  humor: ['Serious', 'Occasional wit', 'Playful', 'Frequently humorous', 'Comedy-focused'],
} as const

export type ToneDescriptorCategory = keyof typeof TONE_DESCRIPTORS

// ============================================
// TONE PROFILE TYPES
// ============================================

export interface ToneProfile {
  id: string
  name: string
  styleDna: string
  sampleText?: string
  sourceUrl?: string
  descriptors?: Partial<Record<ToneDescriptorCategory, string>>
  createdAt: string
  updatedAt: string
}

export interface ToneComparisonResult {
  overallMatch: number
  dimensionScores: {
    voiceTone: number
    sentenceStructure: number
    vocabulary: number
    rhythmPacing: number
  }
  matches: string[]
  mismatches: string[]
  suggestions: string[]
}

/**
 * Parse tone comparison response from Claude
 */
export function parseToneComparisonResponse(response: string): ToneComparisonResult | null {
  try {
    let jsonStr = response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonStr.trim())

    return {
      overallMatch: Number(parsed.overallMatch) || 0,
      dimensionScores: {
        voiceTone: Number(parsed.dimensionScores?.voiceTone) || 0,
        sentenceStructure: Number(parsed.dimensionScores?.sentenceStructure) || 0,
        vocabulary: Number(parsed.dimensionScores?.vocabulary) || 0,
        rhythmPacing: Number(parsed.dimensionScores?.rhythmPacing) || 0,
      },
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      mismatches: Array.isArray(parsed.mismatches) ? parsed.mismatches : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    }
  } catch {
    return null
  }
}

// ============================================
// SAMPLE MINIMUM REQUIREMENTS
// ============================================

export const SAMPLE_REQUIREMENTS = {
  minCharacters: 200,
  recommendedCharacters: 1000,
  maxCharacters: 10000,
  minWords: 50,
  recommendedWords: 200,
} as const

export function validateSampleLength(text: string): {
  valid: boolean
  message: string
  wordCount: number
  charCount: number
} {
  const charCount = text.length
  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length

  if (charCount < SAMPLE_REQUIREMENTS.minCharacters) {
    return {
      valid: false,
      message: `Sample too short. Need at least ${SAMPLE_REQUIREMENTS.minCharacters} characters (currently ${charCount}).`,
      wordCount,
      charCount,
    }
  }

  if (charCount > SAMPLE_REQUIREMENTS.maxCharacters) {
    return {
      valid: false,
      message: `Sample too long. Maximum ${SAMPLE_REQUIREMENTS.maxCharacters} characters (currently ${charCount}).`,
      wordCount,
      charCount,
    }
  }

  let message = 'Sample length is acceptable.'
  if (charCount < SAMPLE_REQUIREMENTS.recommendedCharacters) {
    message = `Sample is short. For best results, provide at least ${SAMPLE_REQUIREMENTS.recommendedWords} words.`
  }

  return { valid: true, message, wordCount, charCount }
}
