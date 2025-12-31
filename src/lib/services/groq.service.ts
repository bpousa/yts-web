/**
 * Groq API Service
 * Handles Whisper transcription for fallback when YouTube transcripts unavailable
 * Ported from: /mnt/c/Projects/yts/Home.py
 */

import Groq from 'groq-sdk'
import { Innertube } from 'youtubei.js'

// ============================================
// CONFIGURATION
// ============================================

const WHISPER_MODEL = 'whisper-large-v3'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB limit for Groq

// ============================================
// CLIENT INITIALIZATION
// ============================================

let groqClient: Groq | null = null

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }
    groqClient = new Groq({ apiKey })
  }
  return groqClient
}

// ============================================
// TRANSCRIPTION
// ============================================

export interface TranscriptionOptions {
  language?: string
  prompt?: string
  temperature?: number
}

export interface TranscriptionResult {
  text: string
  language?: string
  duration?: number
  segments?: TranscriptionSegment[]
}

export interface TranscriptionSegment {
  id: number
  start: number
  end: number
  text: string
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'm4a':
    case 'mp4':
      return 'audio/mp4'
    case 'webm':
      return 'audio/webm'
    case 'wav':
      return 'audio/wav'
    case 'ogg':
      return 'audio/ogg'
    case 'flac':
      return 'audio/flac'
    default:
      return 'audio/mpeg'
  }
}

/**
 * Transcribe audio file using Groq Whisper
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const client = getGroqClient()

  // Check file size
  if (audioBuffer.length > MAX_FILE_SIZE) {
    throw new Error(`Audio file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }

  // Create a File object from the buffer with correct MIME type
  const uint8Array = new Uint8Array(audioBuffer)
  const mimeType = getMimeType(filename)
  const file = new File([uint8Array], filename, { type: mimeType })

  const transcription = await client.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language: options.language,
    prompt: options.prompt,
    temperature: options.temperature ?? 0,
    response_format: 'verbose_json',
  })

  // Cast to any to access verbose_json properties
  const verboseTranscription = transcription as unknown as {
    text: string
    language?: string
    duration?: number
    segments?: Array<{ start: number; end: number; text: string }>
  }

  return {
    text: verboseTranscription.text,
    language: verboseTranscription.language,
    duration: verboseTranscription.duration,
    segments: verboseTranscription.segments?.map((seg, idx) => ({
      id: idx,
      start: seg.start,
      end: seg.end,
      text: seg.text,
    })),
  }
}

/**
 * Transcribe audio from URL (downloads first)
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const response = await fetch(audioUrl)

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Extract filename from URL or use default
  const urlPath = new URL(audioUrl).pathname
  const filename = urlPath.split('/').pop() || 'audio.mp3'

  return transcribeAudio(buffer, filename, options)
}

// ============================================
// AUDIO DOWNLOAD
// ============================================

/**
 * Downloads audio from YouTube for Whisper transcription.
 *
 * Strategy:
 * 1. Try Cobalt API if COBALT_API_URL is configured (recommended)
 * 2. Fall back to youtubei.js (may not work on all serverless platforms)
 *
 * Configure via environment variables:
 * - COBALT_API_URL: Your cobalt instance URL (e.g., https://your-cobalt.example.com)
 * - COBALT_API_KEY: Optional API key if your instance requires auth
 */

const COBALT_API_URL = process.env.COBALT_API_URL
const COBALT_API_KEY = process.env.COBALT_API_KEY

// Singleton Innertube instance for youtubei.js fallback
let innertubeInstance: Innertube | null = null

export interface AudioDownloadResult {
  buffer: Buffer
  filename: string
  duration?: number
  format: string
}

/**
 * Download audio using Cobalt API
 */
async function downloadWithCobalt(videoId: string): Promise<AudioDownloadResult> {
  if (!COBALT_API_URL) {
    throw new Error('Cobalt not configured')
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }

  if (COBALT_API_KEY) {
    headers['Authorization'] = `Api-Key ${COBALT_API_KEY}`
  }

  const response = await fetch(COBALT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      downloadMode: 'audio',
      audioFormat: 'mp3',
      audioBitrate: '64',
    }),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Cobalt authentication failed - check COBALT_API_KEY')
    }
    throw new Error(`Cobalt error: ${response.status}`)
  }

  const data = await response.json()

  if (data.status === 'error') {
    throw new Error(data.error?.message || 'Cobalt download failed')
  }

  const downloadUrl = data.url || data.picker?.[0]?.url
  if (!downloadUrl) {
    throw new Error('No download URL from Cobalt')
  }

  const audioResponse = await fetch(downloadUrl)
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`)
  }

  const buffer = Buffer.from(await audioResponse.arrayBuffer())

  return {
    buffer,
    filename: `${videoId}.mp3`,
    format: 'mp3',
  }
}

/**
 * Download audio using youtubei.js (fallback)
 */
async function downloadWithYoutubei(videoId: string): Promise<AudioDownloadResult> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create()
  }

  const info = await innertubeInstance.getInfo(videoId)

  if (!info?.streaming_data) {
    throw new Error('No streaming data available')
  }

  const audioFormats = info.streaming_data.adaptive_formats
    ?.filter(f => f.has_audio && !f.has_video)
    ?.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))

  if (!audioFormats?.length) {
    throw new Error('No audio formats available')
  }

  const format = audioFormats[0]
  const url = await format.decipher(innertubeInstance.session.player)

  if (!url) {
    throw new Error('Failed to decipher URL')
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Audio too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB)`)
  }

  const mimeType = format.mime_type || 'audio/webm'
  const extension = mimeType.includes('mp4') ? 'm4a' : 'webm'

  return {
    buffer,
    filename: `${videoId}.${extension}`,
    duration: info.basic_info.duration,
    format: extension,
  }
}

/**
 * Main audio download function - tries multiple methods
 */
export async function downloadYouTubeAudio(videoId: string): Promise<AudioDownloadResult> {
  const errors: string[] = []

  // Method 1: Try Cobalt if configured
  if (COBALT_API_URL) {
    try {
      return await downloadWithCobalt(videoId)
    } catch (err) {
      errors.push(`Cobalt: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Method 2: Try youtubei.js
  try {
    return await downloadWithYoutubei(videoId)
  } catch (err) {
    errors.push(`youtubei.js: ${err instanceof Error ? err.message : String(err)}`)
  }

  // All methods failed
  throw new Error(
    'Audio download failed. ' +
    (COBALT_API_URL
      ? `Errors: ${errors.join('; ')}`
      : 'Configure COBALT_API_URL environment variable for AI transcription fallback. ' +
        'See: https://github.com/imputnet/cobalt')
  )
}

// ============================================
// FALLBACK TRANSCRIPTION FLOW
// ============================================

/**
 * Full fallback transcription flow:
 * 1. Download audio from YouTube
 * 2. Transcribe using Groq Whisper
 */
export async function transcribeYouTubeVideo(
  videoId: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  // Download audio
  const audio = await downloadYouTubeAudio(videoId)

  // Transcribe
  return transcribeAudio(audio.buffer, audio.filename, options)
}

// ============================================
// ERROR HANDLING
// ============================================

export function isGroqError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Groq')
}

export function formatGroqError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('rate_limit')) {
      return 'Transcription rate limit reached. Please wait a moment and try again.'
    }
    if (error.message.includes('file_too_large')) {
      return 'Audio file is too large for transcription. Maximum size is 25MB.'
    }
    return `Transcription failed: ${error.message}`
  }
  return 'Unknown transcription error'
}
