/**
 * Text formatting utilities for transcripts and content
 * Ported from: /mnt/c/Projects/yts/Home.py
 */

export interface TranscriptSegment {
  text: string
  start?: number
  duration?: number
}

/**
 * Format transcript segments into readable text
 * Optionally includes timestamps in [HH:MM:SS] format
 */
export function formatTranscript(
  segments: TranscriptSegment[],
  includeTimestamps: boolean = false
): string {
  if (!segments || segments.length === 0) {
    return ''
  }

  const lines = segments.map((segment) => {
    const text = segment.text.trim()

    if (includeTimestamps && segment.start !== undefined) {
      const timestamp = formatTimestamp(segment.start)
      return `[${timestamp}] ${text}`
    }

    return text
  })

  // Join with spaces and clean up
  let result = lines.join(' ')

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ')

  // Add paragraph breaks for readability (after every ~3 sentences or 500 chars)
  result = addParagraphBreaks(result)

  return result.trim()
}

/**
 * Format seconds into HH:MM:SS timestamp
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Add paragraph breaks to long text for readability
 */
export function addParagraphBreaks(text: string, maxCharsPerParagraph: number = 500): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const paragraphs: string[] = []
  let currentParagraph = ''

  for (const sentence of sentences) {
    if (currentParagraph.length + sentence.length > maxCharsPerParagraph && currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.trim())
      currentParagraph = sentence
    } else {
      currentParagraph += sentence
    }
  }

  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim())
  }

  return paragraphs.join('\n\n')
}

/**
 * Clean markdown formatting from text
 * Used for platforms that don't support markdown (Twitter, some webhooks)
 */
export function cleanMarkdown(text: string): string {
  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links but keep text
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Remove inline code
    .replace(/`(.+?)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Truncate text to a maximum length, preserving word boundaries
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) {
    return text
  }

  const truncated = text.substring(0, maxLength - suffix.length)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + suffix
  }

  return truncated + suffix
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

/**
 * Count characters (excluding spaces)
 */
export function countCharacters(text: string, includeSpaces: boolean = true): number {
  if (includeSpaces) {
    return text.length
  }
  return text.replace(/\s/g, '').length
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const words = countWords(text)
  return Math.ceil(words / wordsPerMinute)
}

/**
 * Extract a preview/excerpt from content
 */
export function extractExcerpt(text: string, maxLength: number = 160): string {
  // Remove markdown first
  const clean = cleanMarkdown(text)

  // Get first paragraph or first N characters
  const firstParagraph = clean.split('\n\n')[0] || clean

  return truncateText(firstParagraph, maxLength)
}

/**
 * Normalize whitespace in text
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n +/g, '\n')
    .replace(/ +\n/g, '\n')
    .trim()
}
