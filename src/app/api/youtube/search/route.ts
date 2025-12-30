/**
 * YouTube Search API
 * GET /api/youtube/search - Search YouTube videos
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { youtubeSearchSchema } from '@/lib/utils/validators'
import { searchVideos, getMultipleVideoDetails, parseDuration, formatDuration } from '@/lib/services/youtube.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'youtubeSearch')
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const maxResults = parseInt(searchParams.get('maxResults') || '10')
    const order = searchParams.get('order') || 'relevance'
    const videoDuration = searchParams.get('videoDuration') || 'any'
    const publishedAfter = searchParams.get('publishedAfter') || 'any'

    // Validate
    const validationResult = youtubeSearchSchema.safeParse({
      query,
      maxResults,
      order,
      videoDuration,
      publishedAfter,
    })

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    // Search YouTube
    const searchResults = await searchVideos({
      query: validationResult.data.query,
      maxResults: validationResult.data.maxResults,
      order: validationResult.data.order,
      videoDuration: validationResult.data.videoDuration,
      publishedAfter: validationResult.data.publishedAfter,
    })

    // Get detailed info for the videos (includes duration, view count)
    const videoIds = searchResults.items.map(item => item.videoId)
    const detailedVideos = await getMultipleVideoDetails(videoIds)

    // Create a map for quick lookup
    const detailsMap = new Map(detailedVideos.map(v => [v.videoId, v]))

    // Merge search results with details
    const enrichedResults = searchResults.items.map(item => {
      const details = detailsMap.get(item.videoId)
      return {
        ...item,
        duration: details?.duration,
        durationFormatted: details?.duration
          ? formatDuration(parseDuration(details.duration))
          : undefined,
        viewCount: details?.viewCount,
        likeCount: details?.likeCount,
      }
    })

    const response = NextResponse.json({
      videos: enrichedResults,
      totalResults: searchResults.totalResults,
      nextPageToken: searchResults.nextPageToken,
    })
    applyRateLimitHeaders(response.headers, rateLimitResult)
    return response

  } catch (error) {
    console.error('GET /api/youtube/search error:', error)

    if (error instanceof Error) {
      if (error.message.includes('quotaExceeded')) {
        return NextResponse.json(
          { error: 'YouTube API quota exceeded. Please try again tomorrow.' },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
