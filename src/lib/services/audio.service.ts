/**
 * Audio Processing Service
 * Generates podcast audio using segment-by-segment TTS and ffmpeg concatenation
 */

import { textToSpeech, uploadAudio, type TTSResult } from './tts.service'

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
 * Uses standard ElevenLabs TTS API for each segment, then concatenates
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

  // Generate audio for each segment
  const audioSegments: Array<{ buffer: Buffer; duration: number }> = []
  const totalSegments = segments.length

  for (let i = 0; i < totalSegments; i++) {
    const segment = segments[i]
    const voiceId = voiceMap[segment.speaker]

    try {
      const result: TTSResult = await textToSpeech(segment.text, {
        provider: 'elevenlabs',
        voiceId,
      })

      audioSegments.push({
        buffer: result.audioContent,
        duration: result.duration,
      })

      // Update progress (5-80%)
      if (onProgress) {
        const progress = 5 + Math.round((i + 1) / totalSegments * 75)
        await onProgress('generating_audio', progress)
      }

      // Small delay between API calls to avoid rate limiting
      if (i < totalSegments - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error) {
      console.error(`Error generating segment ${i}:`, error)
      throw new Error(`Failed to generate audio for segment ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (onProgress) {
    await onProgress('stitching', 85)
  }

  // Concatenate all audio segments
  const combinedBuffer = concatenateMP3Buffers(audioSegments.map(s => s.buffer))
  const totalDuration = audioSegments.reduce((sum, s) => sum + s.duration, 0)

  if (onProgress) {
    await onProgress('uploading', 95)
  }

  // Upload to Supabase storage
  const filename = `podcast_${jobId}_${Date.now()}.mp3`
  const audioUrl = await uploadAudio(combinedBuffer, userId, filename)

  if (onProgress) {
    await onProgress('complete', 100)
  }

  return {
    audioUrl,
    duration: totalDuration,
  }
}

/**
 * Concatenate MP3 buffers
 * For MP3, simple buffer concatenation actually works reasonably well
 * since MP3 is a streaming format with independent frames
 */
function concatenateMP3Buffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) {
    throw new Error('No audio buffers to concatenate')
  }

  if (buffers.length === 1) {
    return buffers[0]
  }

  // Simple concatenation works for MP3 because it's frame-based
  // Each MP3 frame is independent and can be decoded on its own
  return Buffer.concat(buffers)
}
