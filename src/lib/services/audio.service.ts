/**
 * Audio Processing Service
 * Generates podcast audio using Railway TTS service
 */

import { uploadAudio } from './tts.service'

const YTS_AUDIO_API_URL = process.env.YTS_AUDIO_API_URL?.trim() || 'https://yts-audio-api-production.up.railway.app'

// ============================================
// TYPES
// ============================================

export interface GeneratePodcastAudioOptions {
  segments: Array<{ speaker: string; text: string; emotion?: string }>
  voiceMap: Record<string, string> // speaker -> voice_id
  userId: string
  jobId: string
  projectName?: string
  onProgress?: (stage: string, progress: number) => Promise<void>
}

export interface PodcastAudioResult {
  audioUrl: string
  duration: number
}

// ============================================
// PODCAST AUDIO GENERATION
// ============================================

/**
 * Generate full podcast audio from script segments
 * Uses Railway TTS service to avoid Vercel serverless timeout issues
 */
export async function generatePodcastAudio(
  options: GeneratePodcastAudioOptions
): Promise<PodcastAudioResult> {
  const { segments, voiceMap, userId, jobId, onProgress } = options

  // Validate voice map
  const speakers = [...new Set(segments.map(s => s.speaker))]
  for (const speaker of speakers) {
    if (!voiceMap[speaker]) {
      throw new Error(`No voice configured for speaker: ${speaker}`)
    }
  }

  if (onProgress) {
    await onProgress('generating_audio', 5)
  }

  console.log(`[Audio] Starting batch TTS via Railway: ${segments.length} segments`)
  console.log(`[Audio] Railway URL: ${YTS_AUDIO_API_URL}`)
  console.log(`[Audio] Voice map:`, voiceMap)

  const startTime = Date.now()

  try {
    // Call Railway TTS batch endpoint
    const response = await fetch(`${YTS_AUDIO_API_URL}/tts/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        segments: segments.map(s => ({ speaker: s.speaker, text: s.text })),
        voiceMap,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }))
      console.error(`[Audio] Railway TTS failed: ${response.status}`, errorData)
      throw new Error(`Railway TTS failed: ${errorData.error || response.statusText}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    console.log(`[Audio] Railway TTS complete in ${Date.now() - startTime}ms, size=${audioBuffer.length}`)

    if (onProgress) {
      await onProgress('stitching', 85)
    }

    // Estimate duration (rough: ~150 words per minute, average 5 chars per word)
    const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0)
    const estimatedDuration = Math.round((totalChars / 5) / 150 * 60)

    if (onProgress) {
      await onProgress('uploading', 95)
    }

    // Upload to Supabase storage
    const filename = `podcast_${jobId}_${Date.now()}.mp3`
    const audioUrl = await uploadAudio(audioBuffer, userId, filename)

    if (onProgress) {
      await onProgress('complete', 100)
    }

    return {
      audioUrl,
      duration: estimatedDuration,
    }
  } catch (error) {
    console.error(`[Audio] Error generating audio:`, error)
    throw error
  }
}

