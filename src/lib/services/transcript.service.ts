/**
 * Transcript Service
 * Fetches transcripts from YouTube videos with fallback to Whisper
 * Ported from: /mnt/c/Projects/yts/Home.py
 */

import { extractVideoId } from '@/lib/utils/youtube-parser'
import { formatTranscript, type TranscriptSegment } from '@/lib/utils/text-formatter'
import { transcribeYouTubeVideo } from './groq.service'

// ============================================
// TYPES
// ============================================

export interface TranscriptResult {
  videoId: string
  title: string
  transcript: string
  segments: TranscriptSegment[]
  source: 'youtube' | 'whisper'
  language?: string
  duration?: number
}

export interface FetchTranscriptOptions {
  includeTimestamps?: boolean
  enableFallback?: boolean
  preferredLanguage?: string
}

// ============================================
// YOUTUBE TRANSCRIPT API
// ============================================

interface YouTubeTranscriptSegment {
  text: string
  start: number
  duration: number
}

/**
 * Fetch transcript using youtube-transcript library approach
 * This uses the YouTube innertube API to get captions
 */
async function fetchYouTubeTranscript(
  videoId: string,
  lang?: string
): Promise<YouTubeTranscriptSegment[]> {
  // Fetch the video page to get caption track URLs
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`

  const response = await fetch(videoUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': lang ? `${lang},en;q=0.9` : 'en-US,en;q=0.9',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch video page: ${response.status}`)
  }

  const html = await response.text()

  // Extract caption tracks from the page
  const captionMatch = html.match(/"captions":\s*(\{[^}]+?"playerCaptionsTracklistRenderer"[^}]+\})/)

  if (!captionMatch) {
    throw new Error('No captions available for this video')
  }

  // Find the caption track URL
  const captionUrlMatch = html.match(/"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);

  if (!captionUrlMatch) {
    throw new Error('Could not find caption track URL')
  }

  // Clean up the URL (unescape unicode)
  let captionUrl = captionUrlMatch[1].replace(/\\u0026/g, '&')

  // Request JSON format
  captionUrl += '&fmt=json3'

  // Fetch the captions
  const captionResponse = await fetch(captionUrl)

  if (!captionResponse.ok) {
    throw new Error(`Failed to fetch captions: ${captionResponse.status}`)
  }

  const captionData = await captionResponse.json()

  // Parse the caption events
  const segments: YouTubeTranscriptSegment[] = []

  for (const event of captionData.events || []) {
    if (!event.segs) continue

    const text = event.segs
      .map((seg: { utf8?: string }) => seg.utf8 || '')
      .join('')
      .trim()

    if (text) {
      segments.push({
        text,
        start: (event.tStartMs || 0) / 1000,
        duration: (event.dDurationMs || 0) / 1000,
      })
    }
  }

  if (segments.length === 0) {
    throw new Error('Caption track is empty')
  }

  return segments
}

/**
 * Get video title from YouTube
 */
async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) return videoId

    const html = await response.text()

    // Try to extract title from meta tag
    const titleMatch = html.match(/<meta name="title" content="([^"]+)"/)
    if (titleMatch) {
      return titleMatch[1]
    }

    // Fallback to og:title
    const ogMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
    if (ogMatch) {
      return ogMatch[1]
    }

    return videoId
  } catch {
    return videoId
  }
}

// ============================================
// MAIN TRANSCRIPT FETCH
// ============================================

/**
 * Fetch transcript for a YouTube video
 * Tries YouTube captions first, falls back to Whisper if enabled
 */
export async function fetchTranscript(
  url: string,
  options: FetchTranscriptOptions = {}
): Promise<TranscriptResult> {
  const videoId = extractVideoId(url)

  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  const { includeTimestamps = false, enableFallback = true } = options

  // Get video title
  const title = await fetchVideoTitle(videoId)

  // Try YouTube transcript first
  try {
    const segments = await fetchYouTubeTranscript(videoId, options.preferredLanguage)

    const transcriptSegments: TranscriptSegment[] = segments.map(seg => ({
      text: seg.text,
      start: seg.start,
      duration: seg.duration,
    }))

    return {
      videoId,
      title,
      transcript: formatTranscript(transcriptSegments, includeTimestamps),
      segments: transcriptSegments,
      source: 'youtube',
      language: options.preferredLanguage || 'en',
    }
  } catch (youtubeError) {
    // If fallback is disabled, throw the error
    if (!enableFallback) {
      throw youtubeError
    }

    // Try Whisper fallback
    try {
      const whisperResult = await transcribeYouTubeVideo(videoId)

      const transcriptSegments: TranscriptSegment[] = whisperResult.segments?.map(seg => ({
        text: seg.text,
        start: seg.start,
        duration: seg.end - seg.start,
      })) || [{ text: whisperResult.text }]

      return {
        videoId,
        title,
        transcript: formatTranscript(transcriptSegments, includeTimestamps),
        segments: transcriptSegments,
        source: 'whisper',
        language: whisperResult.language,
        duration: whisperResult.duration,
      }
    } catch (whisperError) {
      // Both methods failed
      throw new Error(
        `Failed to get transcript. YouTube error: ${youtubeError}. Whisper error: ${whisperError}`
      )
    }
  }
}

// ============================================
// BATCH FETCHING
// ============================================

export interface BatchTranscriptResult {
  successful: TranscriptResult[]
  failed: Array<{ url: string; error: string }>
}

/**
 * Fetch transcripts for multiple videos
 */
export async function fetchTranscriptsBatch(
  urls: string[],
  options: FetchTranscriptOptions = {}
): Promise<BatchTranscriptResult> {
  const results: TranscriptResult[] = []
  const errors: Array<{ url: string; error: string }> = []

  // Process in parallel with concurrency limit
  const concurrency = 3
  const chunks: string[][] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    chunks.push(urls.slice(i, i + concurrency))
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (url) => {
      try {
        const result = await fetchTranscript(url, options)
        results.push(result)
      } catch (error) {
        errors.push({
          url,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    await Promise.all(promises)
  }

  return {
    successful: results,
    failed: errors,
  }
}

// ============================================
// TRANSCRIPT ANALYSIS
// ============================================

export interface TranscriptAnalysis {
  wordCount: number
  estimatedDuration: number // in minutes
  topWords: Array<{ word: string; count: number }>
  sentenceCount: number
}

/**
 * Analyze a transcript for basic statistics
 */
export function analyzeTranscript(transcript: string): TranscriptAnalysis {
  // Count words
  const words = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0)
  const wordCount = words.length

  // Count sentences
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length

  // Estimate duration (average speaking rate ~150 words/minute)
  const estimatedDuration = Math.ceil(wordCount / 150)

  // Get word frequency (excluding common words)
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
    'our', 'their', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
    'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  ])

  const wordFreq = new Map<string, number>()

  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '')
    if (cleaned.length > 3 && !commonWords.has(cleaned)) {
      wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1)
    }
  }

  const topWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }))

  return {
    wordCount,
    estimatedDuration,
    topWords,
    sentenceCount,
  }
}
