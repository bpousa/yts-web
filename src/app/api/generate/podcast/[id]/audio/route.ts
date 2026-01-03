/**
 * Podcast Audio Generation API
 * POST /api/generate/podcast/[id]/audio - Generate audio for a podcast script
 *
 * Synchronous processing with 5-minute timeout
 */

console.log('[AUDIO ROUTE] Module loading...')

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { generatePodcastAudio } from '@/lib/services/audio.service'
import {
  checkRateLimit,
  applyRateLimitHeaders,
  rateLimitExceededResponse,
} from '@/lib/services/rate-limiter.service'

// 5 minute timeout for TTS processing
export const maxDuration = 300

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>

const generateAudioSchema = z.object({
  voiceHost1: z.string().min(1, 'Voice for Host 1 is required'),
  voiceHost2: z.string().min(1, 'Voice for Host 2 is required'),
  script: z.object({
    title: z.string(),
    description: z.string(),
    segments: z.array(z.object({
      speaker: z.string(),
      text: z.string(),
      emotion: z.string().optional(),
    })),
    keyTakeaways: z.array(z.string()),
  }).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('Audio route: starting')

  let serviceSupabase: AnySupabase
  try {
    serviceSupabase = createServiceClient() as AnySupabase
    console.log('Audio route: service client created')
  } catch (err) {
    console.error('Audio route: failed to create service client:', err)
    return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
  }

  try {
    console.log('Audio route: getting params')
    const { id: jobId } = await params
    console.log('Audio route: creating auth client')
    const supabase = await createClient() as AnySupabase
    console.log('Audio route: auth client created')

    // Check authentication
    console.log('Audio route: checking auth')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    console.log('Audio route: auth result', { hasUser: !!user, hasError: !!authError })
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    console.log('Audio route: checking rate limit')
    const rateLimitResult = await checkRateLimit(user.id, 'default')
    console.log('Audio route: rate limit result', { success: rateLimitResult.success })
    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Parse and validate body
    const body = await request.json()
    const validationResult = generateAudioSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { voiceHost1, voiceHost2, script: editedScript } = validationResult.data

    console.log('Audio route: fetching job', { jobId, userId: user.id })

    // Get the job using service role (bypasses RLS)
    const { data: job, error: jobError } = await serviceSupabase
      .from('podcast_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    console.log('Audio route: query result', { found: !!job, error: jobError?.message, code: jobError?.code })

    if (jobError || !job) {
      console.error('Job not found:', { jobId, userId: user.id, error: jobError?.message, code: jobError?.code, hint: jobError?.hint })
      return NextResponse.json({ error: 'Podcast job not found' }, { status: 404 })
    }

    console.log('Audio route: job status', { status: job.status, hasScript: !!job.script })

    const scriptToUse = editedScript || job.script

    if (!scriptToUse || !scriptToUse.segments) {
      console.log('Audio route: no script/segments')
      return NextResponse.json({ error: 'Job has no script to generate audio from' }, { status: 400 })
    }

    if (job.status === 'generating_audio' || job.status === 'stitching') {
      console.log('Audio route: already in progress, returning 409')
      return NextResponse.json({ error: 'Audio generation already in progress' }, { status: 409 })
    }

    console.log('Audio route: proceeding with generation')

    const hostNames = job.options?.hostNames || { host1: 'Alex', host2: 'Jamie' }
    console.log('Audio route: hostNames', hostNames)
    const voiceMap: Record<string, string> = {
      [hostNames.host1]: voiceHost1,
      [hostNames.host2]: voiceHost2,
    }
    console.log('Audio route: voiceMap', voiceMap)

    // Update script if edited
    if (editedScript) {
      console.log('Audio route: updating script')
      await serviceSupabase
        .from('podcast_jobs')
        .update({ script: editedScript, updated_at: new Date().toISOString() })
        .eq('id', jobId)
      console.log('Audio route: script updated')
    }

    // Update status to generating
    console.log('Audio route: updating status to generating_audio')
    await serviceSupabase
      .from('podcast_jobs')
      .update({ status: 'generating_audio', progress: 5, updated_at: new Date().toISOString() })
      .eq('id', jobId)
    console.log('Audio route: status updated')

    console.log('Starting audio generation for job:', jobId, 'segments:', scriptToUse.segments.length)

    try {
      // Generate audio synchronously (within 5-minute timeout)
      const audioResult = await generatePodcastAudio({
        segments: scriptToUse.segments,
        voiceMap,
        userId: user.id,
        jobId,
        serviceClient: serviceSupabase, // Pass service client for storage upload
        onProgress: async (stage, progress) => {
          console.log('Progress:', stage, progress)
          await serviceSupabase
            .from('podcast_jobs')
            .update({
              status: stage as 'generating_audio' | 'stitching' | 'complete',
              progress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
        },
      })

      console.log('Audio generation complete:', audioResult.audioUrl)

      // Update job with completed audio
      await serviceSupabase
        .from('podcast_jobs')
        .update({
          status: 'complete',
          progress: 100,
          audio_url: audioResult.audioUrl,
          duration: audioResult.duration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      // Return completed job
      const response = NextResponse.json({
        job: {
          id: job.id,
          userId: job.user_id,
          contentId: job.content_id,
          status: 'complete',
          progress: 100,
          script: scriptToUse,
          audioUrl: audioResult.audioUrl,
          duration: audioResult.duration,
          error: null,
          createdAt: job.created_at,
          updatedAt: new Date().toISOString(),
        },
      })
      applyRateLimitHeaders(response.headers, rateLimitResult)
      return response
    } catch (error) {
      console.error('Audio generation failed:', error)

      // Update job with error
      await serviceSupabase
        .from('podcast_jobs')
        .update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Audio generation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      throw error
    }
  } catch (error) {
    console.error('POST /api/generate/podcast/[id]/audio error:', error)

    if (error instanceof Error) {
      if (error.message.includes('already in progress')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      // Return actual error message for debugging
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
