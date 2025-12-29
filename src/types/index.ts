// Content format types
export type ContentFormat =
  | 'linkedin'
  | 'twitter'
  | 'blog-short'
  | 'blog-long'
  | 'newsletter'
  | 'youtube-script'
  | 'youtube-short'
  | 'tiktok'
  | 'instagram-reel'
  | 'explainer-video'

export type VoiceStyle =
  | 'professional'
  | 'casual'
  | 'humorous'
  | 'empathetic'
  | 'direct'
  | 'custom'

export type ImageStyle =
  | 'photorealistic'
  | 'cartoon'
  | 'infographic'
  | '3d-render'
  | 'minimalist'
  | 'hand-drawn'
  | 'cyberpunk'
  | 'oil-painting'
  | 'corporate-tech'

export type ImageMood =
  | 'professional'
  | 'vibrant'
  | 'dark-moody'
  | 'soft-light'
  | 'futuristic'

// API Response types
export interface TranscriptResult {
  videoId: string
  videoTitle: string
  videoUrl: string
  content: string
  hasTimestamps: boolean
  source: 'official' | 'whisper'
  error?: string
}

export interface GenerationResult {
  content: string
  imageUrl?: string
  imagePrompt?: string
  seoMetadata?: SEOMetadata
}

export interface SEOMetadata {
  title: string
  description: string
  keywords: string[]
  faqs: { question: string; answer: string }[]
  socialHooks: string[]
}

// YouTube Search types
export interface YouTubeVideo {
  id: string
  title: string
  description: string
  channelTitle: string
  thumbnailUrl: string
  publishedAt: string
}

export interface YouTubeSearchParams {
  query: string
  maxResults?: number
  sortBy?: 'relevance' | 'date' | 'rating' | 'viewCount' | 'title'
  duration?: 'any' | 'short' | 'medium' | 'long'
  uploadDate?: 'any' | 'day' | 'week' | 'month' | 'year'
}
