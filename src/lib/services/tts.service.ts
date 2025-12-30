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
const ELEVENLABS_VOICES_ENDPOINT = 'https://api.elevenlabs.io/v1/voices'
const ELEVENLABS_VOICE_DESIGN_ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-voice/create-previews'
const ELEVENLABS_PROJECTS_ENDPOINT = 'https://api.elevenlabs.io/v1/studio/projects'

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
// ELEVENLABS VOICE TYPES
// ============================================

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  preview_url: string | null
  category: string
  labels: {
    accent?: string
    description?: string
    age?: string
    gender?: string
    use_case?: string
  }
  description?: string
}

export interface VoiceLibraryResponse {
  voices: ElevenLabsVoice[]
}

export interface VoiceDesignPreview {
  generated_voice_id: string
  audio_base_64: string
  media_type: string
  duration_secs: number
}

export interface VoiceDesignResponse {
  previews: VoiceDesignPreview[]
  text: string
}

export interface SavedVoice {
  id: string
  voice_id: string
  name: string
  description?: string
  gender?: string
  accent?: string
  age?: string
  preview_url?: string
  source: 'library' | 'designed' | 'cloned'
  design_prompt?: string
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

// ============================================
// ELEVENLABS VOICE LIBRARY
// ============================================

/**
 * Fetch all available voices from ElevenLabs library
 */
export async function fetchElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  const response = await fetch(ELEVENLABS_VOICES_ENDPOINT, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch voices: ${error}`)
  }

  const data: VoiceLibraryResponse = await response.json()
  return data.voices
}

/**
 * Get a specific voice by ID from ElevenLabs
 */
export async function getElevenLabsVoice(voiceId: string): Promise<ElevenLabsVoice | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  const response = await fetch(`${ELEVENLABS_VOICES_ENDPOINT}/${voiceId}`, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const error = await response.text()
    throw new Error(`Failed to fetch voice: ${error}`)
  }

  return response.json()
}

// ============================================
// ELEVENLABS VOICE DESIGN
// ============================================

/**
 * Design a new voice from a text description
 * Returns 3 preview options to choose from
 */
export async function designVoice(
  description: string,
  previewText?: string
): Promise<VoiceDesignResponse> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  // Default preview text for podcast context
  const text = previewText ||
    "Hello and welcome to our podcast. Today we're diving into something really fascinating that I think you're going to love."

  const response = await fetch(ELEVENLABS_VOICE_DESIGN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      voice_description: description,
      text,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voice design failed: ${error}`)
  }

  return response.json()
}

/**
 * Create a permanent voice from a design preview
 */
export async function saveDesignedVoice(
  generatedVoiceId: string,
  name: string,
  description?: string
): Promise<ElevenLabsVoice> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  // Create the voice from the preview
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-voice/create-voice-from-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      voice_name: name,
      voice_description: description || `AI-designed voice: ${name}`,
      generated_voice_id: generatedVoiceId,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to save voice: ${error}`)
  }

  const data = await response.json()

  // Return the voice info
  return {
    voice_id: data.voice_id,
    name,
    preview_url: null,
    category: 'generated',
    labels: {},
    description: description || `AI-designed voice`,
  }
}

/**
 * Generate a short audio preview for a voice
 */
export async function generateVoicePreview(
  voiceId: string,
  text?: string
): Promise<{ audioBase64: string; duration: number }> {
  const previewText = text ||
    "Hello! This is a preview of how I sound. I hope you like my voice."

  const result = await synthesizeWithElevenLabs(previewText, voiceId)

  return {
    audioBase64: result.audioContent.toString('base64'),
    duration: result.duration,
  }
}

/**
 * Delete a voice from ElevenLabs (only works for user-created voices)
 */
export async function deleteElevenLabsVoice(voiceId: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  const response = await fetch(`${ELEVENLABS_VOICES_ENDPOINT}/${voiceId}`, {
    method: 'DELETE',
    headers: {
      'xi-api-key': apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete voice: ${error}`)
  }
}

// ============================================
// ELEVENLABS STUDIO PROJECTS API
// ============================================

export interface PodcastSegment {
  speaker: string
  text: string
  emotion?: string
}

export interface CreatePodcastProjectOptions {
  name: string
  segments: PodcastSegment[]
  voiceMap: Record<string, string> // speaker name -> voice_id
  qualityPreset?: 'standard' | 'high' | 'ultra' | 'ultra_lossless'
  callbackUrl?: string
}

export interface ProjectStatus {
  projectId: string
  state: 'creating' | 'default' | 'converting' | 'in_queue'
  canBeDownloaded: boolean
  progress?: number
}

/**
 * Create a podcast project using ElevenLabs Studio API
 * This handles multi-speaker audio generation natively
 */
export async function createPodcastProject(
  options: CreatePodcastProjectOptions
): Promise<{ projectId: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  // Build the from_content_json structure
  const contentNodes = options.segments.map(segment => ({
    voice_id: options.voiceMap[segment.speaker],
    text: cleanTextForTTS(segment.text),
    type: 'tts_node',
  }))

  const fromContent = [{
    name: options.name,
    blocks: [{
      sub_type: 'p',
      nodes: contentNodes,
    }],
  }]

  // Create form data
  const formData = new FormData()
  formData.append('name', options.name)
  formData.append('from_content_json', JSON.stringify(fromContent))
  formData.append('auto_convert', 'true')
  formData.append('quality_preset', options.qualityPreset || 'high')
  formData.append('default_model_id', 'eleven_multilingual_v2')

  // Get default voice for title (use first speaker's voice)
  const firstSpeaker = options.segments[0]?.speaker
  const defaultVoiceId = firstSpeaker ? options.voiceMap[firstSpeaker] : undefined
  if (defaultVoiceId) {
    formData.append('default_paragraph_voice_id', defaultVoiceId)
  }

  if (options.callbackUrl) {
    formData.append('callback_url', options.callbackUrl)
  }

  const response = await fetch(ELEVENLABS_PROJECTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create podcast project: ${error}`)
  }

  const data = await response.json()
  return { projectId: data.project.project_id }
}

/**
 * Get the status of a podcast project
 */
export async function getPodcastProjectStatus(
  projectId: string
): Promise<ProjectStatus> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  const response = await fetch(`${ELEVENLABS_PROJECTS_ENDPOINT}/${projectId}`, {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get project status: ${error}`)
  }

  const data = await response.json()

  return {
    projectId: data.project_id,
    state: data.state,
    canBeDownloaded: data.can_be_downloaded,
    progress: data.creation_meta?.creation_progress,
  }
}

/**
 * Download the audio for a completed project
 */
export async function downloadPodcastAudio(
  projectId: string
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  // Get the project snapshots to find the audio URL
  const snapshotsResponse = await fetch(
    `${ELEVENLABS_PROJECTS_ENDPOINT}/${projectId}/snapshots`,
    {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    }
  )

  if (!snapshotsResponse.ok) {
    const error = await snapshotsResponse.text()
    throw new Error(`Failed to get project snapshots: ${error}`)
  }

  const snapshotsData = await snapshotsResponse.json()
  const latestSnapshot = snapshotsData.snapshots?.[0]

  if (!latestSnapshot) {
    throw new Error('No snapshots available for download')
  }

  // Stream the audio from the snapshot
  const audioResponse = await fetch(
    `${ELEVENLABS_PROJECTS_ENDPOINT}/${projectId}/snapshots/${latestSnapshot.project_snapshot_id}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        convert_to_mpeg: true,
      }),
    }
  )

  if (!audioResponse.ok) {
    const error = await audioResponse.text()
    throw new Error(`Failed to download audio: ${error}`)
  }

  const audioBuffer = await audioResponse.arrayBuffer()
  return Buffer.from(audioBuffer)
}

/**
 * Generate complete podcast audio using ElevenLabs Studio
 * This is the main function for podcast audio generation
 */
export async function generatePodcastWithStudio(
  options: CreatePodcastProjectOptions & {
    onProgress?: (status: string, progress: number) => Promise<void>
    maxWaitMs?: number
  }
): Promise<{ audioBuffer: Buffer; duration: number }> {
  const { onProgress, maxWaitMs = 600000 } = options // 10 minute default timeout

  // Step 1: Create the project
  if (onProgress) await onProgress('creating_project', 0)
  const { projectId } = await createPodcastProject(options)

  // Step 2: Poll for completion
  const startTime = Date.now()
  let lastProgress = 0

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getPodcastProjectStatus(projectId)

    if (status.canBeDownloaded) {
      if (onProgress) await onProgress('downloading', 90)
      break
    }

    if (status.state === 'converting' || status.state === 'in_queue') {
      const progress = Math.round((status.progress || 0) * 80) + 10 // 10-90%
      if (progress > lastProgress) {
        lastProgress = progress
        if (onProgress) await onProgress('converting', progress)
      }
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  // Check final status
  const finalStatus = await getPodcastProjectStatus(projectId)
  if (!finalStatus.canBeDownloaded) {
    throw new Error('Podcast generation timed out or failed')
  }

  // Step 3: Download the audio
  if (onProgress) await onProgress('downloading', 95)
  const audioBuffer = await downloadPodcastAudio(projectId)

  // Estimate duration based on buffer size (rough estimate: 128kbps MP3)
  const estimatedDuration = Math.round((audioBuffer.length * 8) / (128 * 1000))

  if (onProgress) await onProgress('complete', 100)

  return {
    audioBuffer,
    duration: estimatedDuration,
  }
}
