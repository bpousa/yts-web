/**
 * Podcast Service
 * Generates podcast scripts from blog content
 * Coordinates with TTS service for audio generation
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { generateContent } from './claude.service'
import {
  buildPodcastScriptPrompt,
  estimateTotalDuration,
  HOST_PERSONAS,
  type PodcastScriptOptions,
} from '@/lib/prompts/podcast-generation'
import { createClient } from '@/lib/supabase/server'
import { createPodcastProject, getPodcastProjectStatus, downloadPodcastAudio } from './tts.service'
import { uploadAudio } from './tts.service'

// Type workaround for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

// ============================================
// TYPES
// ============================================

export interface PodcastSegment {
  speaker: string
  text: string
  emotion?: string
  audioUrl?: string
  duration?: number
}

export interface PodcastScript {
  title: string
  description: string
  segments: PodcastSegment[]
  keyTakeaways: string[]
}

export interface PodcastJob {
  id: string
  userId: string
  contentId: string
  status: 'pending' | 'generating_script' | 'generating_audio' | 'stitching' | 'complete' | 'failed'
  progress: number
  script?: PodcastScript
  audioUrl?: string
  duration?: number
  error?: string
  createdAt: string
  updatedAt: string
}

export interface GeneratePodcastOptions extends PodcastScriptOptions {
  contentId: string
  ttsProvider?: 'google' | 'elevenlabs' | 'none'
  voiceHost1?: string
  voiceHost2?: string
}

// ============================================
// SCRIPT GENERATION
// ============================================

/**
 * Generate a podcast script from blog content
 */
export async function generatePodcastScript(
  blogContent: string,
  options: PodcastScriptOptions = {}
): Promise<PodcastScript> {
  const prompt = buildPodcastScriptPrompt(blogContent, options)

  const systemPrompt = 'You are a podcast script writer. You convert blog posts into natural, engaging two-host podcast conversations. Always respond with valid JSON only, no markdown code blocks.'

  const response = await generateContent(systemPrompt, prompt, {
    maxTokens: 4000,
    temperature: 0.8, // Higher temperature for more natural conversation
  })

  // Parse the JSON response
  try {
    // Clean up response - remove markdown code blocks if present
    let jsonStr = response
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    }
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '')
    }

    const script = JSON.parse(jsonStr.trim()) as PodcastScript

    // Validate required fields
    if (!script.title || !script.segments || !Array.isArray(script.segments)) {
      throw new Error('Invalid script format: missing required fields')
    }

    // Add duration estimates to segments
    script.segments = script.segments.map(seg => ({
      ...seg,
      duration: Math.ceil(seg.text.split(/\s+/).length / 2.5), // ~150 wpm
    }))

    return script
  } catch (error) {
    console.error('Failed to parse podcast script:', error)
    console.error('Raw response:', response)
    throw new Error('Failed to parse podcast script from AI response')
  }
}

/**
 * Generate podcast from existing content
 */
export async function generatePodcastFromContent(
  userId: string,
  options: GeneratePodcastOptions
): Promise<PodcastJob> {
  const supabase = await createClient() as AnySupabase as AnySupabase

  // Get the source content
  const { data: content, error: contentError } = await supabase
    .from('generated_content')
    .select('*')
    .eq('id', options.contentId)
    .eq('user_id', userId)
    .single()

  if (contentError || !content) {
    throw new Error('Content not found')
  }

  // Create job record
  const { data: job, error: jobError } = await supabase
    .from('podcast_jobs')
    .insert({
      user_id: userId,
      content_id: options.contentId,
      status: 'generating_script',
      progress: 0,
      options: {
        targetDuration: options.targetDuration || 'medium',
        tone: options.tone || 'casual',
        ttsProvider: options.ttsProvider || 'none',
        hostNames: options.hostNames || { host1: 'Alex', host2: 'Jamie' },
        hostRoles: options.hostRoles,
        focusGuidance: options.focusGuidance,
      },
    })
    .select()
    .single()

  if (jobError) {
    throw new Error(`Failed to create podcast job: ${jobError.message}`)
  }

  // For script-only generation (ttsProvider === 'none'), generate synchronously
  if (options.ttsProvider === 'none') {
    try {
      // Generate the script
      const script = await generatePodcastScript(content.content, {
        hostNames: options.hostNames,
        hostRoles: options.hostRoles,
        targetDuration: options.targetDuration,
        tone: options.tone,
        focusGuidance: options.focusGuidance,
        includeIntro: options.includeIntro ?? true,
        includeOutro: options.includeOutro ?? true,
      })

      const duration = estimateTotalDuration(script.segments)

      // Update job with completed script
      const { data: updatedJob } = await supabase
        .from('podcast_jobs')
        .update({
          status: 'complete',
          progress: 100,
          script,
          duration: duration.seconds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .select()
        .single()

      return mapJobToResponse(updatedJob || job)
    } catch (error) {
      // Update job with error
      await supabase
        .from('podcast_jobs')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      throw error
    }
  }

  // For full audio generation with ElevenLabs - async approach
  // We create the project and return immediately, client polls for completion
  try {
    // First generate the script (this is fast, ~5-10 seconds)
    const script = await generatePodcastScript(content.content, {
      hostNames: options.hostNames,
      hostRoles: options.hostRoles,
      targetDuration: options.targetDuration,
      tone: options.tone,
      focusGuidance: options.focusGuidance,
      includeIntro: options.includeIntro ?? true,
      includeOutro: options.includeOutro ?? true,
    })

    const estimatedDuration = estimateTotalDuration(script.segments)

    // Get host names for voice mapping
    const hostNames = options.hostNames || { host1: 'Alex', host2: 'Jamie' }

    // Create the ElevenLabs project (fast, ~2-3 seconds)
    const { projectId } = await createPodcastProject({
      name: `Podcast ${job.id}`,
      segments: script.segments,
      voiceMap: {
        [hostNames.host1]: options.voiceHost1!,
        [hostNames.host2]: options.voiceHost2!,
      },
      qualityPreset: 'high',
    })

    // Update job with script and project ID, return immediately
    // Client will poll GET /api/generate/podcast/[id] to check status
    const { data: updatedJob } = await supabase
      .from('podcast_jobs')
      .update({
        status: 'generating_audio',
        progress: 30,
        script,
        duration: estimatedDuration.seconds,
        options: {
          ...job.options,
          elevenlabsProjectId: projectId,
          voiceHost1: options.voiceHost1,
          voiceHost2: options.voiceHost2,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select()
      .single()

    return mapJobToResponse(updatedJob || job)
  } catch (error) {
    // Update job with error
    await supabase
      .from('podcast_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Audio generation failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    throw error
  }
}

/**
 * Get podcast job status
 * If audio is being generated, check ElevenLabs status and finalize if ready
 */
export async function getPodcastJob(
  userId: string,
  jobId: string
): Promise<PodcastJob | null> {
  const supabase = await createClient() as AnySupabase

  const { data: job, error } = await supabase
    .from('podcast_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) {
    return null
  }

  // If audio is being generated, check ElevenLabs status
  if (job.status === 'generating_audio' && job.options?.elevenlabsProjectId) {
    try {
      const projectId = job.options.elevenlabsProjectId
      const status = await getPodcastProjectStatus(projectId)

      if (status.canBeDownloaded) {
        // Audio is ready! Download and upload to Supabase
        const audioBuffer = await downloadPodcastAudio(projectId)
        const filename = `podcast_${jobId}_${Date.now()}.mp3`
        const audioUrl = await uploadAudio(audioBuffer, userId, filename)

        // Estimate duration based on buffer size (128kbps MP3)
        const estimatedDuration = Math.round((audioBuffer.length * 8) / (128 * 1000))

        // Update job with completed audio
        const { data: updatedJob } = await supabase
          .from('podcast_jobs')
          .update({
            status: 'complete',
            progress: 100,
            audio_url: audioUrl,
            duration: estimatedDuration || job.duration,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .select()
          .single()

        return mapJobToResponse(updatedJob || job)
      } else if (status.state === 'converting' || status.state === 'in_queue') {
        // Still processing, update progress
        const progress = Math.round((status.progress || 0) * 60) + 30 // 30-90%
        if (progress > job.progress) {
          await supabase
            .from('podcast_jobs')
            .update({
              progress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)

          job.progress = progress
        }
      }
    } catch (err) {
      console.error('Error checking ElevenLabs status:', err)
      // Don't fail the request, just return current job status
    }
  }

  return mapJobToResponse(job)
}

/**
 * List podcast jobs for a user
 */
export async function listPodcastJobs(
  userId: string,
  options: { limit?: number; status?: string } = {}
): Promise<PodcastJob[]> {
  const supabase = await createClient() as AnySupabase
  const { limit = 20, status } = options

  let query = supabase
    .from('podcast_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: jobs, error } = await query

  if (error) {
    throw new Error(`Failed to list podcast jobs: ${error.message}`)
  }

  return (jobs || []).map(mapJobToResponse)
}

/**
 * Delete a podcast job
 */
export async function deletePodcastJob(
  userId: string,
  jobId: string
): Promise<void> {
  const supabase = await createClient() as AnySupabase

  const { error } = await supabase
    .from('podcast_jobs')
    .delete()
    .eq('id', jobId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete podcast job: ${error.message}`)
  }
}

// ============================================
// SCRIPT EXPORT
// ============================================

/**
 * Export script to different formats
 */
export function exportScript(
  script: PodcastScript,
  format: 'json' | 'txt' | 'srt'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(script, null, 2)

    case 'txt':
      let txt = `# ${script.title}\n\n`
      txt += `${script.description}\n\n`
      txt += '---\n\n'
      for (const seg of script.segments) {
        txt += `**${seg.speaker}:** ${seg.text}\n\n`
      }
      txt += '---\n\n## Key Takeaways\n\n'
      for (const takeaway of script.keyTakeaways) {
        txt += `- ${takeaway}\n`
      }
      return txt

    case 'srt':
      let srt = ''
      let index = 1
      let currentTime = 0
      for (const seg of script.segments) {
        const duration = seg.duration || Math.ceil(seg.text.split(/\s+/).length / 2.5)
        const startTime = formatSrtTime(currentTime)
        const endTime = formatSrtTime(currentTime + duration)
        srt += `${index}\n`
        srt += `${startTime} --> ${endTime}\n`
        srt += `[${seg.speaker}] ${seg.text}\n\n`
        currentTime += duration
        index++
      }
      return srt

    default:
      throw new Error(`Unknown export format: ${format}`)
  }
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

// ============================================
// HELPERS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapJobToResponse(job: any): PodcastJob {
  return {
    id: job.id,
    userId: job.user_id,
    contentId: job.content_id,
    status: job.status,
    progress: job.progress || 0,
    script: job.script,
    audioUrl: job.audio_url,
    duration: job.duration,
    error: job.error,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  }
}

/**
 * Get default voices for a TTS provider
 */
export function getDefaultVoices(provider: 'google' | 'elevenlabs'): {
  host1: string
  host2: string
} {
  return {
    host1: HOST_PERSONAS.alex.defaultVoice[provider],
    host2: HOST_PERSONAS.jamie.defaultVoice[provider],
  }
}

// ============================================
// AUDIO GENERATION
// ============================================

export interface GenerateAudioOptions {
  jobId: string
  voiceHost1: string
  voiceHost2: string
}

/**
 * Generate audio for an existing podcast job
 */
export async function generateAudioForJob(
  userId: string,
  options: GenerateAudioOptions
): Promise<PodcastJob> {
  const supabase = await createClient() as AnySupabase

  // Get the job
  const { data: job, error: jobError } = await supabase
    .from('podcast_jobs')
    .select('*')
    .eq('id', options.jobId)
    .eq('user_id', userId)
    .single()

  if (jobError || !job) {
    throw new Error('Podcast job not found')
  }

  if (!job.script || !job.script.segments) {
    throw new Error('Job has no script to generate audio from')
  }

  if (job.status === 'generating_audio' || job.status === 'stitching') {
    throw new Error('Audio generation already in progress')
  }

  // Get host names from job options
  const hostNames = job.options?.hostNames || { host1: 'Alex', host2: 'Jamie' }

  // Create voice map
  const voiceMap: Record<string, string> = {
    [hostNames.host1]: options.voiceHost1,
    [hostNames.host2]: options.voiceHost2,
  }

  // Update job status
  await supabase
    .from('podcast_jobs')
    .update({
      status: 'generating_audio',
      progress: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)

  try {
    // Generate audio
    const audioResult = await generatePodcastAudio({
      segments: job.script.segments,
      voiceMap,
      userId,
      jobId: job.id,
      onProgress: async (stage, progress) => {
        await supabase
          .from('podcast_jobs')
          .update({
            status: stage as 'generating_audio' | 'stitching' | 'complete',
            progress,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
      },
    })

    // Update job with audio URL
    const { data: updatedJob } = await supabase
      .from('podcast_jobs')
      .update({
        status: 'complete',
        progress: 100,
        audio_url: audioResult.audioUrl,
        duration: audioResult.duration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select()
      .single()

    return mapJobToResponse(updatedJob || job)
  } catch (error) {
    // Update job with error
    await supabase
      .from('podcast_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Audio generation failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    throw error
  }
}
