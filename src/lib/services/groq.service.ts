/**
 * Groq API Service
 * Handles Whisper transcription for fallback when YouTube transcripts unavailable
 * Ported from: /mnt/c/Projects/yts/Home.py
 */

import Groq from 'groq-sdk'
import { Innertube } from 'youtubei.js'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import youtubedl from 'youtube-dl-exec'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

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

// Residential proxy for direct YouTube downloads (bypasses Cobalt)
const RESIDENTIAL_PROXY_URL = process.env.RESIDENTIAL_PROXY_URL

// Singleton Innertube instances
let innertubeInstance: Innertube | null = null
let innertubeProxyInstance: Innertube | null = null

/**
 * Get or create Innertube instance with proxy support
 */
async function getProxyInnertube(): Promise<Innertube> {
  if (innertubeProxyInstance) {
    return innertubeProxyInstance
  }

  if (!RESIDENTIAL_PROXY_URL) {
    throw new Error('RESIDENTIAL_PROXY_URL not configured')
  }

  console.log('[Proxy] Creating Innertube with proxy...')
  const proxyAgent = new ProxyAgent(RESIDENTIAL_PROXY_URL)

  innertubeProxyInstance = await Innertube.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: async (input: any, init: any) => {
      // Handle string URLs, Request objects, and URL objects
      let url: string
      if (typeof input === 'string') {
        url = input
      } else if (input instanceof URL) {
        url = input.toString()
      } else if (input?.url) {
        url = input.url
      } else if (input?.href) {
        url = input.href
      } else {
        console.error('[Proxy] Unknown input type:', typeof input, input)
        throw new Error(`Failed to parse URL from ${typeof input}`)
      }

      // Extract method - check init first, then input (if Request object)
      const inputMethod = typeof input !== 'string' ? input?.method : undefined
      const method = (init?.method || inputMethod || 'GET').toUpperCase()
      console.log(`[Proxy] ${method} ${url.substring(0, 80)}...`)

      // Convert Headers object to plain object - merge from input and init
      let headers: Record<string, string> = {}

      // First get headers from input (Request object)
      const inputHeaders = typeof input !== 'string' ? input?.headers : undefined
      if (inputHeaders) {
        if (inputHeaders instanceof Headers) {
          inputHeaders.forEach((value: string, key: string) => {
            headers[key] = value
          })
        } else if (typeof inputHeaders === 'object') {
          headers = { ...headers, ...inputHeaders } as Record<string, string>
        }
      }

      // Then merge/override with init headers
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value: string, key: string) => {
            headers[key] = value
          })
        } else if (typeof init.headers === 'object') {
          headers = { ...headers, ...init.headers } as Record<string, string>
        }
      }

      // Get body - check init first, then input (if Request object)
      const inputBody = typeof input !== 'string' ? input?.body : undefined
      const body = init?.body || inputBody

      // Build fetch init
      const fetchInit: Parameters<typeof undiciFetch>[1] = {
        method,
        headers,
        dispatcher: proxyAgent,
      }

      // Include body only for POST/PUT/PATCH
      if (body && method !== 'GET' && method !== 'HEAD') {
        fetchInit.body = body
        fetchInit.duplex = 'half' // Required for Node.js fetch with body streams
      }

      console.log(`[Proxy] Headers:`, Object.keys(headers).join(', '))
      const response = await undiciFetch(url, fetchInit)
      console.log(`[Proxy] Response: ${response.status}`)
      return response as unknown as Response
    },
  })

  console.log('[Proxy] Innertube with proxy created')
  return innertubeProxyInstance
}

export interface AudioDownloadResult {
  buffer: Buffer
  filename: string
  duration?: number
  format: string
}

// Retry and timeout configuration
const MAX_COBALT_RETRIES = 3
const TUNNEL_FETCH_TIMEOUT = 60000 // 60 seconds for tunnel fetch
const CHUNK_READ_TIMEOUT = 30000 // 30 seconds between chunks

/**
 * Download audio using yt-dlp (most robust method)
 * This is the same approach as the working Python version
 */
async function downloadWithYtdlp(videoId: string): Promise<AudioDownloadResult> {
  console.log('[yt-dlp] Starting download for video:', videoId)

  const url = `https://www.youtube.com/watch?v=${videoId}`
  const outputPath = join(tmpdir(), `${videoId}_${Date.now()}.mp3`)

  try {
    console.log('[yt-dlp] Output path:', outputPath)
    console.log('[yt-dlp] Using proxy:', RESIDENTIAL_PROXY_URL ? 'Yes' : 'No')

    // Run yt-dlp with same settings as Python version
    await youtubedl(url, {
      extractAudio: true,
      audioFormat: 'mp3',
      audioQuality: 9, // 0 (best) to 9 (worst), 9 ≈ 32kbps
      output: outputPath,
      proxy: RESIDENTIAL_PROXY_URL || undefined,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      // Add user agent to avoid detection
      addHeader: ['User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
    })

    console.log('[yt-dlp] Download complete, reading file...')

    // Read the downloaded file
    const buffer = await readFile(outputPath)
    console.log('[yt-dlp] File size:', buffer.length, 'bytes')

    // Clean up temp file
    await unlink(outputPath).catch(() => {})

    if (buffer.length === 0) {
      throw new Error('yt-dlp returned empty file')
    }

    return {
      buffer,
      filename: `${videoId}.mp3`,
      format: 'mp3',
    }
  } catch (err: unknown) {
    // Clean up on error
    await unlink(outputPath).catch(() => {})

    // Extract detailed error info
    const error = err as { message?: string; stderr?: string; stdout?: string; code?: number }
    console.error('[yt-dlp] Error details:', {
      message: error?.message,
      stderr: error?.stderr,
      stdout: error?.stdout,
      code: error?.code,
      raw: String(err),
    })

    const errorMsg = error?.stderr || error?.message || String(err) || 'Unknown error'
    throw new Error(`yt-dlp failed: ${errorMsg}`)
  }
}

/**
 * Download audio using Cobalt API with retry logic
 */
async function downloadWithCobalt(videoId: string): Promise<AudioDownloadResult> {
  console.log('[Cobalt] Starting download for video:', videoId)
  console.log('[Cobalt] API URL:', COBALT_API_URL)

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

  let lastError: Error | null = null

  // Retry loop - each attempt gets a fresh tunnel URL
  for (let attempt = 1; attempt <= MAX_COBALT_RETRIES; attempt++) {
    try {
      console.log(`[Cobalt] Attempt ${attempt}/${MAX_COBALT_RETRIES}`)

      // Step 1: Request audio from Cobalt (get fresh tunnel URL each time)
      let response: Response
      try {
        console.log('[Cobalt] Sending request to Cobalt API...')
        response = await fetch(COBALT_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            downloadMode: 'audio',
            audioFormat: 'mp3',
            audioBitrate: '64',
          }),
          signal: AbortSignal.timeout(30000), // 30s timeout for API request
        })
        console.log('[Cobalt] API response status:', response.status)
      } catch (err) {
        console.error('[Cobalt] Connection error:', err)
        throw new Error(`Cobalt connection failed: ${err instanceof Error ? err.message : 'Network error'}`)
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown')
        console.error('[Cobalt] API error:', response.status, errorText)
        if (response.status === 401 || response.status === 403) {
          throw new Error('Cobalt authentication failed - check COBALT_API_KEY')
        }
        let errorDetail = ''
        try {
          const errData = JSON.parse(errorText)
          errorDetail = errData.error?.code || errData.error?.message || errorText.slice(0, 100)
        } catch {
          errorDetail = errorText.slice(0, 100)
        }
        throw new Error(`Cobalt error: ${response.status} - ${errorDetail}`)
      }

      const data = await response.json()
      console.log('[Cobalt] API response data:', JSON.stringify(data))

      if (data.status === 'error') {
        const errCode = data.error?.code || 'unknown'
        console.error('[Cobalt] Error in response:', errCode, data.error)
        const errorMessages: Record<string, string> = {
          'error.api.youtube.login': 'This video requires YouTube login (age-restricted or private)',
          'error.api.youtube.unavailable': 'Video unavailable on YouTube',
          'error.api.content.video.unavailable': 'Video content unavailable',
        }
        throw new Error(errorMessages[errCode] || `Cobalt: ${errCode}`)
      }

      const downloadUrl = data.url || data.picker?.[0]?.url
      console.log('[Cobalt] Download URL:', downloadUrl)

      if (!downloadUrl) {
        throw new Error(`No download URL from Cobalt (status: ${data.status})`)
      }

      // Step 2: Download the audio file from tunnel/redirect URL with timeout
      console.log('[Cobalt] Fetching audio from tunnel URL...')
      let audioResponse: Response
      try {
        audioResponse = await fetch(downloadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(TUNNEL_FETCH_TIMEOUT),
        })
        console.log('[Cobalt] Audio fetch status:', audioResponse.status)
        console.log('[Cobalt] Audio headers:', JSON.stringify(Object.fromEntries(audioResponse.headers.entries())))
      } catch (err) {
        console.error('[Cobalt] Audio fetch error:', err)
        throw new Error(`Audio fetch error: ${err instanceof Error ? err.message : 'Network error'}`)
      }

      if (!audioResponse.ok) {
        const errorText = await audioResponse.text().catch(() => '')
        console.error('[Cobalt] Audio download failed:', audioResponse.status, errorText)
        throw new Error(`Audio download failed (${audioResponse.status}): ${errorText.slice(0, 100)}`)
      }

      // Check Content-Length before reading stream
      const contentLength = audioResponse.headers.get('content-length')
      console.log('[Cobalt] Content-Length header:', contentLength)
      if (contentLength === '0') {
        console.warn(`[Cobalt] Attempt ${attempt}: Empty Content-Length, will retry with fresh tunnel`)
        throw new Error('Tunnel returned empty response (Content-Length: 0)')
      }

      // Read response body as chunks with timeout
      const chunks: Uint8Array[] = []
      const reader = audioResponse.body?.getReader()

      if (!reader) {
        console.error('[Cobalt] No response body reader')
        throw new Error('No response body reader available')
      }

      try {
        let totalRead = 0
        while (true) {
          // Race between chunk read and timeout
          const readPromise = reader.read()
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Chunk read timeout - stream stalled')), CHUNK_READ_TIMEOUT)
          })

          const { done, value } = await Promise.race([readPromise, timeoutPromise])
          if (done) break
          if (value) {
            chunks.push(value)
            totalRead += value.length
            // Log progress every 500KB
            if (totalRead % (500 * 1024) < value.length) {
              console.log(`[Cobalt] Downloaded ${(totalRead / 1024).toFixed(0)}KB...`)
            }
          }
        }
        console.log('[Cobalt] Total bytes read:', totalRead)
      } finally {
        reader.releaseLock()
      }

      // Combine chunks into buffer
      const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
      console.log('[Cobalt] Final buffer size:', buffer.length)

      // Check if buffer is empty and retry if so
      if (buffer.length === 0) {
        console.warn(`[Cobalt] Attempt ${attempt}: Empty audio buffer, retrying with fresh tunnel...`)
        lastError = new Error('Audio download returned empty buffer')
        continue // Try again with fresh tunnel URL
      }

      // Success! Return the buffer
      console.log(`[Cobalt] Successfully downloaded ${(buffer.length / 1024).toFixed(0)}KB audio on attempt ${attempt}`)
      return {
        buffer,
        filename: `${videoId}.mp3`,
        format: 'mp3',
      }

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[Cobalt] Attempt ${attempt} failed:`, lastError.message)

      // Don't retry on authentication or permanent errors
      if (lastError.message.includes('authentication') ||
          lastError.message.includes('age-restricted') ||
          lastError.message.includes('unavailable')) {
        throw lastError
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_COBALT_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`[Cobalt] Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // All retries exhausted
  throw new Error(
    `Audio download failed after ${MAX_COBALT_RETRIES} attempts. ` +
    (lastError ? lastError.message : 'Unknown error') +
    '\n\nThis may be due to:\n' +
    '- Video is age-restricted or requires login\n' +
    '- Regional restrictions on the video\n' +
    '- Temporary proxy/network issues (try again later)'
  )
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
 * Download audio using youtubei.js with residential proxy
 * This bypasses Cobalt and downloads directly through the DataImpulse proxy
 * All requests (including video info) go through the proxy
 */
async function downloadWithProxy(videoId: string): Promise<AudioDownloadResult> {
  console.log('[Proxy] Starting download for video:', videoId)

  if (!RESIDENTIAL_PROXY_URL) {
    throw new Error('RESIDENTIAL_PROXY_URL not configured')
  }

  console.log('[Proxy] Using proxy:', RESIDENTIAL_PROXY_URL.replace(/:[^:@]+@/, ':****@'))

  // Get proxy-enabled Innertube instance (all requests go through proxy)
  const innertube = await getProxyInnertube()

  const info = await innertube.getInfo(videoId)

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
  const audioUrl = await format.decipher(innertube.session.player)

  if (!audioUrl) {
    throw new Error('Failed to decipher audio URL')
  }

  console.log('[Proxy] Downloading from:', audioUrl.substring(0, 80) + '...')

  // Download using proxy with undici
  const proxyAgent = new ProxyAgent(RESIDENTIAL_PROXY_URL)
  const response = await undiciFetch(audioUrl, {
    dispatcher: proxyAgent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
    },
    signal: AbortSignal.timeout(120000), // 2 minute timeout
  })

  console.log('[Proxy] Response status:', response.status)

  if (!response.ok) {
    throw new Error(`Proxy download failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  console.log('[Proxy] Downloaded:', buffer.length, 'bytes')

  if (buffer.length === 0) {
    throw new Error('Proxy returned empty response')
  }

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
 * Order: yt-dlp (best) → Cobalt → Proxy+youtubei.js → youtubei.js direct
 */
export async function downloadYouTubeAudio(videoId: string): Promise<AudioDownloadResult> {
  const errors: string[] = []

  // Method 1: Try yt-dlp with proxy (most robust - same as Python version)
  if (RESIDENTIAL_PROXY_URL) {
    try {
      return await downloadWithYtdlp(videoId)
    } catch (err) {
      errors.push(`yt-dlp: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Method 2: Try Cobalt if configured
  if (COBALT_API_URL) {
    try {
      return await downloadWithCobalt(videoId)
    } catch (err) {
      errors.push(`Cobalt: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Method 3: Try direct proxy download (undici + residential proxy + youtubei.js)
  if (RESIDENTIAL_PROXY_URL) {
    try {
      return await downloadWithProxy(videoId)
    } catch (err) {
      errors.push(`Proxy: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Method 4: Try youtubei.js direct (datacenter IP - usually blocked)
  try {
    return await downloadWithYoutubei(videoId)
  } catch (err) {
    errors.push(`youtubei.js: ${err instanceof Error ? err.message : String(err)}`)
  }

  // All methods failed
  throw new Error(`Audio download failed. Errors: ${errors.join('; ')}`)
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
