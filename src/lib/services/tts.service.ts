/**
 * Text-to-Speech Service
 * Converts podcast script segments to audio
 * Supports Google Cloud TTS and ElevenLabs
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Type workaround for dynamic storage access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

// ============================================
// CONFIGURATION
// ============================================

const GOOGLE_TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const ELEVENLABS_TTS_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech'

// Voice configurations
export const VOICE_OPTIONS = {
  google: {
    'en-US-Neural2-A': { name: 'Neural2 A (Male)', gender: 'MALE' },
    'en-US-Neural2-C': { name: 'Neural2 C (Female)', gender: 'FEMALE' },
    'en-US-Neural2-D': { name: 'Neural2 D (Male)', gender: 'MALE' },
    'en-US-Neural2-E': { name: 'Neural2 E (Female)', gender: 'FEMALE' },
    'en-US-Neural2-F': { name: 'Neural2 F (Female)', gender: 'FEMALE' },
    'en-US-Neural2-G': { name: 'Neural2 G (Female)', gender: 'FEMALE' },
    'en-US-Neural2-H': { name: 'Neural2 H (Female)', gender: 'FEMALE' },
    'en-US-Neural2-I': { name: 'Neural2 I (Male)', gender: 'MALE' },
    'en-US-Neural2-J': { name: 'Neural2 J (Male)', gender: 'MALE' },
    'en-US-Studio-M': { name: 'Studio M (Male)', gender: 'MALE' },
    'en-US-Studio-O': { name: 'Studio O (Female)', gender: 'FEMALE' },
  },
  elevenlabs: {
    'pNInz6obpgDQGcFmaJgB': { name: 'Adam', gender: 'MALE' },
    'EXAVITQu4vr4xnSDxMaL': { name: 'Bella', gender: 'FEMALE' },
    '21m00Tcm4TlvDq8ikWAM': { name: 'Rachel', gender: 'FEMALE' },
    'AZnzlk1XvdvUeBnXmlld': { name: 'Domi', gender: 'FEMALE' },
    'MF3mGyEYCl7XYWbV9V6O': { name: 'Elli', gender: 'FEMALE' },
    'TxGEqnHWrfWFTfGW9XjX': { name: 'Josh', gender: 'MALE' },
    'VR6AewLTigWG4xSOukaG': { name: 'Arnold', gender: 'MALE' },
    'yoZ06aMxZJJ28mfd3POQ': { name: 'Sam', gender: 'MALE' },
  },
} as const

// ============================================
// TYPES
// ============================================

export type TTSProvider = 'google' | 'elevenlabs'

export interface TTSOptions {
  provider: TTSProvider
  voiceId: string
  speakingRate?: number // 0.25 to 4.0 for Google, stability for ElevenLabs
  pitch?: number // -20 to 20 for Google
  emotion?: string // For ElevenLabs style
}

export interface TTSResult {
  audioContent: Buffer
  duration: number // estimated in seconds
  format: 'mp3' | 'wav'
}

export interface AudioSegment {
  speaker: string
  text: string
  audioContent: Buffer
  duration: number
}

// ============================================
// GOOGLE CLOUD TTS
// ============================================

async function synthesizeWithGoogle(
  text: string,
  voiceId: string,
  options: Partial<TTSOptions> = {}
): Promise<TTSResult> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error('Google Cloud API key not configured')
  }

  const response = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: voiceId,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: options.speakingRate || 1.0,
        pitch: options.pitch || 0,
        effectsProfileId: ['headphone-class-device'],
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google TTS error: ${error}`)
  }

  const data = await response.json()
  const audioContent = Buffer.from(data.audioContent, 'base64')

  // Estimate duration (Google doesn't return this)
  const words = text.split(/\s+/).length
  const duration = Math.ceil(words / 2.5) // ~150 wpm

  return {
    audioContent,
    duration,
    format: 'mp3',
  }
}

// ============================================
// ELEVENLABS TTS
// ============================================

async function synthesizeWithElevenLabs(
  text: string,
  voiceId: string,
  options: Partial<TTSOptions> = {}
): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  const response = await fetch(`${ELEVENLABS_TTS_ENDPOINT}/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: options.speakingRate || 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs error: ${error}`)
  }

  const audioBuffer = await response.arrayBuffer()
  const audioContent = Buffer.from(audioBuffer)

  // Estimate duration
  const words = text.split(/\s+/).length
  const duration = Math.ceil(words / 2.5)

  return {
    audioContent,
    duration,
    format: 'mp3',
  }
}

// ============================================
// MAIN TTS FUNCTION
// ============================================

/**
 * Convert text to speech using the specified provider
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions
): Promise<TTSResult> {
  // Clean text for TTS
  const cleanedText = cleanTextForTTS(text)

  switch (options.provider) {
    case 'google':
      return synthesizeWithGoogle(cleanedText, options.voiceId, options)
    case 'elevenlabs':
      return synthesizeWithElevenLabs(cleanedText, options.voiceId, options)
    default:
      throw new Error(`Unknown TTS provider: ${options.provider}`)
  }
}

/**
 * Synthesize multiple segments with different voices
 */
export async function synthesizeSegments(
  segments: Array<{ speaker: string; text: string }>,
  voiceMap: Record<string, { provider: TTSProvider; voiceId: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<AudioSegment[]> {
  const results: AudioSegment[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const voiceConfig = voiceMap[segment.speaker]

    if (!voiceConfig) {
      throw new Error(`No voice configured for speaker: ${segment.speaker}`)
    }

    const result = await textToSpeech(segment.text, {
      provider: voiceConfig.provider,
      voiceId: voiceConfig.voiceId,
    })

    results.push({
      speaker: segment.speaker,
      text: segment.text,
      audioContent: result.audioContent,
      duration: result.duration,
    })

    if (onProgress) {
      onProgress(i + 1, segments.length)
    }

    // Small delay between API calls to avoid rate limiting
    if (i < segments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

// ============================================
// AUDIO STITCHING
// ============================================

/**
 * Concatenate audio segments into a single file
 * Note: This creates a simple concatenation. For production,
 * consider using ffmpeg or a proper audio processing library
 */
export function concatenateAudioSegments(
  segments: AudioSegment[],
  pauseBetweenMs: number = 500
): Buffer {
  // For MP3 files, simple concatenation doesn't work well
  // This is a placeholder - real implementation needs ffmpeg
  // For now, just return the first segment or throw
  if (segments.length === 0) {
    throw new Error('No audio segments to concatenate')
  }

  // In production, use ffmpeg via a service like:
  // - Vercel Edge Functions with @ffmpeg.wasm/main
  // - External service like Bannerbear or Creatomate
  // - Lambda function with ffmpeg layer

  console.warn(
    'Audio concatenation requires ffmpeg. Returning first segment only for now.'
  )

  return segments[0].audioContent
}

/**
 * Upload audio to Supabase Storage
 */
export async function uploadAudio(
  audioBuffer: Buffer,
  userId: string,
  filename: string
): Promise<string> {
  const supabase = await createClient() as AnySupabase

  const path = `podcasts/${userId}/${filename}`

  const { error } = await supabase.storage
    .from('audio')
    .upload(path, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload audio: ${error.message}`)
  }

  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(path)

  return urlData.publicUrl
}

// ============================================
// HELPERS
// ============================================

/**
 * Clean text for TTS synthesis
 */
function cleanTextForTTS(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/`/g, '')
    // Replace common abbreviations
    .replace(/\betc\./gi, 'etcetera')
    .replace(/\be\.g\./gi, 'for example')
    .replace(/\bi\.e\./gi, 'that is')
    // Add pauses for better phrasing
    .replace(/\.\.\./g, ', ')
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Estimate TTS cost for a text
 */
export function estimateTTSCost(
  text: string,
  provider: TTSProvider
): { characters: number; estimatedCost: number } {
  const characters = text.length

  // Approximate pricing (as of 2024)
  const costPerMillion = {
    google: 16, // Neural2 voices
    elevenlabs: 30, // Standard voices
  }

  const estimatedCost = (characters / 1_000_000) * costPerMillion[provider]

  return {
    characters,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
  }
}

/**
 * Get available voices for a provider
 */
export function getAvailableVoices(provider: TTSProvider) {
  return VOICE_OPTIONS[provider]
}
