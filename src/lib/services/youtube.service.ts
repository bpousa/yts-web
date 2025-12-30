/**
 * YouTube API Service
 * Handles YouTube Data API v3 interactions
 * Ported from: /mnt/c/Projects/yts/pages/Search_Videos.py
 */

// ============================================
// CONFIGURATION
// ============================================

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

// ============================================
// TYPES
// ============================================

export interface YouTubeSearchOptions {
  query: string
  maxResults?: number
  order?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title'
  videoDuration?: 'any' | 'short' | 'medium' | 'long'
  publishedAfter?: 'any' | 'day' | 'week' | 'month' | 'year'
  channelId?: string
  regionCode?: string
}

export interface YouTubeVideoResult {
  videoId: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  publishedAt: string
  thumbnails: {
    default: string
    medium: string
    high: string
  }
  duration?: string
  viewCount?: number
  likeCount?: number
}

export interface YouTubeSearchResult {
  items: YouTubeVideoResult[]
  totalResults: number
  nextPageToken?: string
  prevPageToken?: string
}

export interface YouTubeVideoDetails {
  videoId: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  publishedAt: string
  duration: string
  viewCount: number
  likeCount: number
  commentCount: number
  tags: string[]
  categoryId: string
  thumbnails: {
    default: string
    medium: string
    high: string
    maxres?: string
  }
}

// ============================================
// API HELPERS
// ============================================

function getApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured')
  }
  return apiKey
}

function getPublishedAfterDate(period: string): string | undefined {
  if (period === 'any') return undefined

  const now = new Date()

  switch (period) {
    case 'day':
      now.setDate(now.getDate() - 1)
      break
    case 'week':
      now.setDate(now.getDate() - 7)
      break
    case 'month':
      now.setMonth(now.getMonth() - 1)
      break
    case 'year':
      now.setFullYear(now.getFullYear() - 1)
      break
    default:
      return undefined
  }

  return now.toISOString()
}

// ============================================
// SEARCH
// ============================================

/**
 * Search for YouTube videos
 */
export async function searchVideos(
  options: YouTubeSearchOptions
): Promise<YouTubeSearchResult> {
  const apiKey = getApiKey()

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    key: apiKey,
    q: options.query,
    maxResults: String(options.maxResults || 10),
    order: options.order || 'relevance',
  })

  if (options.videoDuration && options.videoDuration !== 'any') {
    params.set('videoDuration', options.videoDuration)
  }

  if (options.publishedAfter && options.publishedAfter !== 'any') {
    const afterDate = getPublishedAfterDate(options.publishedAfter)
    if (afterDate) {
      params.set('publishedAfter', afterDate)
    }
  }

  if (options.channelId) {
    params.set('channelId', options.channelId)
  }

  if (options.regionCode) {
    params.set('regionCode', options.regionCode)
  }

  const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'YouTube search failed')
  }

  const data = await response.json()

  const items: YouTubeVideoResult[] = data.items.map((item: Record<string, unknown>) => {
    const snippet = item.snippet as Record<string, unknown>
    const thumbnails = snippet.thumbnails as Record<string, Record<string, string>>
    const id = item.id as Record<string, string>

    return {
      videoId: id.videoId,
      title: snippet.title,
      description: snippet.description,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      thumbnails: {
        default: thumbnails.default?.url || '',
        medium: thumbnails.medium?.url || '',
        high: thumbnails.high?.url || '',
      },
    }
  })

  return {
    items,
    totalResults: data.pageInfo?.totalResults || items.length,
    nextPageToken: data.nextPageToken,
    prevPageToken: data.prevPageToken,
  }
}

// ============================================
// VIDEO DETAILS
// ============================================

/**
 * Get detailed information about a video
 */
export async function getVideoDetails(videoId: string): Promise<YouTubeVideoDetails | null> {
  const apiKey = getApiKey()

  const params = new URLSearchParams({
    part: 'snippet,contentDetails,statistics',
    id: videoId,
    key: apiKey,
  })

  const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get video details')
  }

  const data = await response.json()

  if (!data.items || data.items.length === 0) {
    return null
  }

  const item = data.items[0]
  const snippet = item.snippet
  const contentDetails = item.contentDetails
  const statistics = item.statistics

  return {
    videoId: item.id,
    title: snippet.title,
    description: snippet.description,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    publishedAt: snippet.publishedAt,
    duration: contentDetails.duration,
    viewCount: parseInt(statistics.viewCount) || 0,
    likeCount: parseInt(statistics.likeCount) || 0,
    commentCount: parseInt(statistics.commentCount) || 0,
    tags: snippet.tags || [],
    categoryId: snippet.categoryId,
    thumbnails: {
      default: snippet.thumbnails?.default?.url || '',
      medium: snippet.thumbnails?.medium?.url || '',
      high: snippet.thumbnails?.high?.url || '',
      maxres: snippet.thumbnails?.maxres?.url,
    },
  }
}

/**
 * Get details for multiple videos at once
 */
export async function getMultipleVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideoDetails[]> {
  if (videoIds.length === 0) return []

  const apiKey = getApiKey()

  // YouTube API allows up to 50 video IDs per request
  const chunks: string[][] = []
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50))
  }

  const results: YouTubeVideoDetails[] = []

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: chunk.join(','),
      key: apiKey,
    })

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`)

    if (!response.ok) {
      continue // Skip failed chunks
    }

    const data = await response.json()

    for (const item of data.items || []) {
      const snippet = item.snippet
      const contentDetails = item.contentDetails
      const statistics = item.statistics

      results.push({
        videoId: item.id,
        title: snippet.title,
        description: snippet.description,
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        publishedAt: snippet.publishedAt,
        duration: contentDetails.duration,
        viewCount: parseInt(statistics.viewCount) || 0,
        likeCount: parseInt(statistics.likeCount) || 0,
        commentCount: parseInt(statistics.commentCount) || 0,
        tags: snippet.tags || [],
        categoryId: snippet.categoryId,
        thumbnails: {
          default: snippet.thumbnails?.default?.url || '',
          medium: snippet.thumbnails?.medium?.url || '',
          high: snippet.thumbnails?.high?.url || '',
          maxres: snippet.thumbnails?.maxres?.url,
        },
      })
    }
  }

  return results
}

// ============================================
// DURATION PARSING
// ============================================

/**
 * Parse ISO 8601 duration to seconds
 * Example: PT4M13S -> 253
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)

  if (!match) return 0

  const hours = parseInt(match[1]) || 0
  const minutes = parseInt(match[2]) || 0
  const seconds = parseInt(match[3]) || 0

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Format duration to human readable string
 * Example: 253 -> "4:13"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// ============================================
// ERROR HANDLING
// ============================================

export function isYouTubeError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('YouTube')
}

export function formatYouTubeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('quotaExceeded')) {
      return 'YouTube API quota exceeded. Please try again tomorrow.'
    }
    if (error.message.includes('invalidApiKey')) {
      return 'Invalid YouTube API key. Please check your configuration.'
    }
    return `YouTube API error: ${error.message}`
  }
  return 'Unknown YouTube API error'
}
