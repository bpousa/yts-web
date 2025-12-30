/**
 * Groq API Service
 * Handles Whisper transcription for fallback when YouTube transcripts unavailable
 * Ported from: /mnt/c/Projects/yts/Home.py
 */

import Groq from 'groq-sdk'

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

  // Create a File object from the buffer
  const uint8Array = new Uint8Array(audioBuffer)
  const file = new File([uint8Array], filename, { type: 'audio/mpeg' })

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
// AUDIO DOWNLOAD (yt-dlp alternative for serverless)
// ============================================

/**
 * Note: In the original Python app, yt-dlp is used to download audio.
 * For serverless environments, we need an alternative approach:
 *
 * Options:
 * 1. Use a third-party service (e.g., cobalt.tools API)
 * 2. Use a microservice running yt-dlp
 * 3. Use YouTube's audio stream directly (may be unreliable)
 *
 * This function provides the interface, actual implementation
 * depends on the chosen approach.
 */

export interface AudioDownloadResult {
  buffer: Buffer
  filename: string
  duration?: number
  format: string
}

export async function downloadYouTubeAudio(videoId: string): Promise<AudioDownloadResult> {
  // Option 1: Use cobalt.tools API (free, rate-limited)
  const cobaltResponse = await fetch('https://co.wuk.sh/api/json', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      aFormat: 'mp3',
      isAudioOnly: true,
      audioBitrate: '32', // 32kbps for smaller file size
    }),
  })

  if (!cobaltResponse.ok) {
    const error = await cobaltResponse.text()
    throw new Error(`Audio download failed: ${error}`)
  }

  const cobaltData = await cobaltResponse.json()

  if (cobaltData.status === 'error') {
    throw new Error(cobaltData.text || 'Audio download failed')
  }

  if (!cobaltData.url) {
    throw new Error('No download URL returned')
  }

  // Download the audio file
  const audioResponse = await fetch(cobaltData.url)

  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio file: ${audioResponse.status}`)
  }

  const arrayBuffer = await audioResponse.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return {
    buffer,
    filename: `${videoId}.mp3`,
    format: 'mp3',
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
