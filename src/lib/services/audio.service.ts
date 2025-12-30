/**
 * Audio Processing Service
 * Uses ElevenLabs Studio Projects API for multi-speaker podcast generation
 */

import { generatePodcastWithStudio, uploadAudio } from './tts.service'

// ============================================
// TYPES
// ============================================

export interface GeneratePodcastAudioOptions {
  segments: Array<{ speaker: string; text: string }>
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
 * Uses ElevenLabs Studio Projects API for native multi-speaker support
 */
export async function generatePodcastAudio(
  options: GeneratePodcastAudioOptions
): Promise<PodcastAudioResult> {
  const { segments, voiceMap, userId, jobId, projectName, onProgress } = options

  // Validate voice map
  const speakers = [...new Set(segments.map(s => s.speaker))]
  for (const speaker of speakers) {
    if (!voiceMap[speaker]) {
      throw new Error(`No voice configured for speaker: ${speaker}`)
    }
  }

  // Generate audio using ElevenLabs Studio
  const result = await generatePodcastWithStudio({
    name: projectName || `Podcast ${jobId}`,
    segments,
    voiceMap,
    qualityPreset: 'high',
    onProgress: async (status, progress) => {
      if (onProgress) {
        // Map ElevenLabs status to our status
        let stage = 'generating_audio'
        if (status === 'downloading') stage = 'stitching'
        if (status === 'complete') stage = 'complete'
        await onProgress(stage, progress)
      }
    },
  })

  // Upload to Supabase storage
  if (onProgress) {
    await onProgress('uploading', 98)
  }

  const filename = `podcast_${jobId}_${Date.now()}.mp3`
  const audioUrl = await uploadAudio(result.audioBuffer, userId, filename)

  if (onProgress) {
    await onProgress('complete', 100)
  }

  return {
    audioUrl,
    duration: result.duration,
  }
}
