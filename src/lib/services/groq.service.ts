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
// AUDIO DOWNLOAD (using youtubei.js)
// ============================================

/**
 * Downloads audio from YouTube using youtubei.js
 * This is a pure JavaScript solution that works in serverless environments
 * without requiring yt-dlp, FFmpeg, or external APIs like Cobalt.
 */

// Singleton Innertube instance
let innertubeInstance: Innertube | null = null

async function getInnertube(): Promise<Innertube> {
  if (!innertubeInstance) {
    innertubeInstance = await Innertube.create({
      retrieve_player: true,
    })
  }
  return innertubeInstance
}

export interface AudioDownloadResult {
  buffer: Buffer
  filename: string
  duration?: number
  format: string
}

export async function downloadYouTubeAudio(videoId: string): Promise<AudioDownloadResult> {
  const yt = await getInnertube()

  // Get video info
  const info = await yt.getBasicInfo(videoId)

  if (!info.streaming_data) {
    throw new Error('No streaming data available for this video')
  }

  // Find the best audio-only format
  // Prefer lower bitrate formats to stay under Groq's 25MB limit
  const audioFormats = info.streaming_data.adaptive_formats
    ?.filter(f => f.has_audio && !f.has_video)
    ?.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0)) // Sort by bitrate ascending

  if (!audioFormats || audioFormats.length === 0) {
    throw new Error('No audio formats available for this video')
  }

  // Pick a low-bitrate format (first one after sorting)
  // This helps keep file size under 25MB for Whisper
  const format = audioFormats[0]

  // Get the download URL
  const url = await format.decipher(yt.session.player)

  if (!url) {
    throw new Error('Failed to decipher audio URL')
  }

  // Download the audio
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `Audio file is ${(buffer.length / 1024 / 1024).toFixed(1)}MB, ` +
      `which exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit for Whisper transcription. ` +
      'Try a shorter video.'
    )
  }

  // Determine format extension
  const mimeType = format.mime_type || 'audio/webm'
  const extension = mimeType.includes('mp4') ? 'm4a' :
                    mimeType.includes('webm') ? 'webm' : 'audio'

  return {
    buffer,
    filename: `${videoId}.${extension}`,
    duration: info.basic_info.duration,
    format: extension,
  }
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
