/**
 * SEO Analysis Prompts
 * Generates SEO metadata and analyzes content for search optimization
 */

// ============================================
// SEO ANALYSIS SYSTEM PROMPT
// ============================================

export const SEO_SYSTEM_PROMPT = `You are an expert SEO strategist and content optimizer. Your task is to analyze content and generate SEO-optimized metadata that will improve search visibility and click-through rates.

## YOUR EXPERTISE
- Search engine ranking factors and algorithms
- Keyword optimization and semantic SEO
- Meta tag best practices
- User intent analysis
- Readability optimization

## OUTPUT REQUIREMENTS
You must return a JSON object with the following structure:
{
  "title": "SEO-optimized title (50-60 characters)",
  "metaDescription": "Compelling meta description (150-160 characters)",
  "keywords": ["primary keyword", "secondary keyword", ...],
  "headings": {
    "h1": "Main heading suggestion",
    "h2s": ["Subheading 1", "Subheading 2", ...]
  },
  "readabilityScore": 0-100,
  "readabilityLevel": "Easy|Moderate|Difficult",
  "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2", ...]
}

## GUIDELINES
1. **Title Tag:**
   - Include primary keyword near the beginning
   - Create curiosity or promise value
   - Stay under 60 characters to avoid truncation
   - Avoid clickbait that doesn't match content

2. **Meta Description:**
   - Include a clear call-to-action
   - Naturally incorporate primary keyword
   - Summarize the value proposition
   - Stay between 150-160 characters

3. **Keywords:**
   - Extract 5-10 relevant keywords
   - Include long-tail variations
   - Consider search intent (informational, transactional, navigational)
   - Order by relevance/importance

4. **Readability Analysis:**
   - Score based on Flesch-Kincaid methodology
   - Consider sentence length, word complexity, paragraph structure
   - Provide actionable improvement suggestions

5. **Heading Structure:**
   - Suggest clear, keyword-rich H1
   - Recommend logical H2 subheadings for content structure
   - Ensure headings tell a story when read alone
`

// ============================================
// SEO USER MESSAGE BUILDER
// ============================================

export function buildSEOUserMessage(content: string, targetKeyword?: string): string {
  let message = `Analyze the following content and generate SEO metadata:\n\n---\n${content}\n---\n`

  if (targetKeyword) {
    message += `\nPrimary target keyword to optimize for: "${targetKeyword}"`
  }

  message += '\n\nReturn your analysis as a valid JSON object following the specified structure.'

  return message
}

// ============================================
// READABILITY SCORING (Client-side calculation)
// ============================================

/**
 * Calculate Flesch-Kincaid Reading Ease score
 * Higher scores indicate easier readability
 * 90-100: Very Easy (5th grade)
 * 80-89: Easy (6th grade)
 * 70-79: Fairly Easy (7th grade)
 * 60-69: Standard (8th-9th grade)
 * 50-59: Fairly Difficult (10th-12th grade)
 * 30-49: Difficult (College)
 * 0-29: Very Difficult (College Graduate)
 */
export function calculateReadabilityScore(text: string): {
  score: number
  level: string
  stats: {
    wordCount: number
    sentenceCount: number
    syllableCount: number
    avgWordsPerSentence: number
    avgSyllablesPerWord: number
  }
} {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)

  const wordCount = words.length
  const sentenceCount = Math.max(sentences.length, 1)
  const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0)

  const avgWordsPerSentence = wordCount / sentenceCount
  const avgSyllablesPerWord = syllableCount / Math.max(wordCount, 1)

  // Flesch-Kincaid Reading Ease formula
  const score = Math.round(
    206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
  )

  // Clamp to 0-100
  const clampedScore = Math.max(0, Math.min(100, score))

  let level: string
  if (clampedScore >= 90) level = 'Very Easy'
  else if (clampedScore >= 80) level = 'Easy'
  else if (clampedScore >= 70) level = 'Fairly Easy'
  else if (clampedScore >= 60) level = 'Standard'
  else if (clampedScore >= 50) level = 'Fairly Difficult'
  else if (clampedScore >= 30) level = 'Difficult'
  else level = 'Very Difficult'

  return {
    score: clampedScore,
    level,
    stats: {
      wordCount,
      sentenceCount,
      syllableCount,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    },
  }
}

/**
 * Count syllables in a word (approximate)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '')

  if (word.length <= 3) return 1

  // Remove silent e at end
  word = word.replace(/e$/, '')

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g)

  return vowelGroups ? Math.max(vowelGroups.length, 1) : 1
}

// ============================================
// SEO RESULT TYPE
// ============================================

export interface SEOAnalysisResult {
  title: string
  metaDescription: string
  keywords: string[]
  headings: {
    h1: string
    h2s: string[]
  }
  readabilityScore: number
  readabilityLevel: string
  suggestions: string[]
}

/**
 * Parse and validate SEO analysis response from Claude
 */
export function parseSEOResponse(response: string): SEOAnalysisResult | null {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonStr.trim())

    // Validate required fields
    if (!parsed.title || !parsed.metaDescription || !Array.isArray(parsed.keywords)) {
      return null
    }

    return {
      title: String(parsed.title).substring(0, 70),
      metaDescription: String(parsed.metaDescription).substring(0, 170),
      keywords: parsed.keywords.slice(0, 10).map(String),
      headings: {
        h1: parsed.headings?.h1 || '',
        h2s: Array.isArray(parsed.headings?.h2s) ? parsed.headings.h2s.map(String) : [],
      },
      readabilityScore: Number(parsed.readabilityScore) || 0,
      readabilityLevel: String(parsed.readabilityLevel) || 'Unknown',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    }
  } catch {
    return null
  }
}
