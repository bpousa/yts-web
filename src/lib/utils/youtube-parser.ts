/**
 * YouTube URL parsing and video ID extraction utilities
 * Ported from: /mnt/c/Projects/yts/Home.py
 */

// Regex patterns for different YouTube URL formats
const YOUTUBE_PATTERNS = [
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  // Short URL: youtu.be/VIDEO_ID
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  // Embed URL: youtube.com/embed/VIDEO_ID
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  // Shorts URL: youtube.com/shorts/VIDEO_ID
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  // Live URL: youtube.com/live/VIDEO_ID
  /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
]

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  const trimmedUrl = url.trim()

  // Check if it's already just a video ID (11 characters, alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return trimmedUrl
  }

  // Try each pattern
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmedUrl.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Validate if a string is a valid YouTube video ID
 */
export function isValidVideoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id)
}

/**
 * Build a standard YouTube watch URL from a video ID
 */
export function buildYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/**
 * Build a YouTube thumbnail URL for a video
 */
export function buildThumbnailUrl(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'
): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

/**
 * Parse multiple URLs from a text input (one per line)
 */
export function parseMultipleUrls(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return []
  }

  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Extract video IDs from multiple URLs
 * Returns array of { url, videoId, valid } objects
 */
export function extractMultipleVideoIds(
  urls: string[]
): Array<{ url: string; videoId: string | null; valid: boolean }> {
  return urls.map((url) => {
    const videoId = extractVideoId(url)
    return {
      url,
      videoId,
      valid: videoId !== null,
    }
  })
}

/**
 * Sanitize a filename by removing illegal characters
 * Used when saving transcripts with video titles as filenames
 */
export function sanitizeFilename(filename: string): string {
  // Remove characters that are illegal in filenames
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200) // Limit length
}

/**
 * Generate a project folder name from timestamp
 */
export function generateProjectName(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
}
