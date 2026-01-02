'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Image as ImageIcon, Youtube, CheckCircle2, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react'

import { useWizard } from '@/hooks/useWizard'
import { WizardStepIndicator } from '@/components/generator/WizardStepIndicator'
import { WizardNavigation } from '@/components/generator/WizardNavigation'
import { Step1SourceMaterial } from '@/components/generator/steps/Step1SourceMaterial'
import { Step2ContentFormat } from '@/components/generator/steps/Step2ContentFormat'
import { Step3VoiceTone } from '@/components/generator/steps/Step3VoiceTone'
import { Step4ImageExtras } from '@/components/generator/steps/Step4ImageExtras'
import { ContentResults } from '@/components/generator/ContentResults'

interface FetchingVideo {
  videoId: string
  status: 'pending' | 'fetching' | 'success' | 'error'
  title?: string
  error?: string
}

function GeneratorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const wizard = useWizard()

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedContentId, setGeneratedContentId] = useState<string | null>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  // Extension fetching state
  const [isFetchingFromExtension, setIsFetchingFromExtension] = useState(false)
  const [fetchingVideos, setFetchingVideos] = useState<FetchingVideo[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showFetchSummary, setShowFetchSummary] = useState(false)

  // Handle URL params from Chrome extension
  useEffect(() => {
    const videos = searchParams.get('videos')
    const urlFormat = searchParams.get('format')
    const instructions = searchParams.get('instructions')

    if (videos) {
      // Auto-fetch transcripts from video IDs
      const videoIds = videos.split(',')
      handleExtensionVideos(videoIds)
    }

    if (urlFormat) {
      wizard.updateData({ format: urlFormat })
    }

    if (instructions) {
      wizard.updateData({ customInstructions: instructions })
    }
  }, [searchParams])

  const handleExtensionVideos = async (videoIds: string[]) => {
    setIsFetchingFromExtension(true)

    // Initialize video status
    const initialVideos: FetchingVideo[] = videoIds.slice(0, 3).map(id => ({
      videoId: id,
      status: 'pending',
    }))
    setFetchingVideos(initialVideos)

    const fetchedIds: string[] = []

    for (let i = 0; i < initialVideos.length; i++) {
      const videoId = initialVideos[i].videoId

      // Update to fetching
      setFetchingVideos(prev => prev.map((v, idx) =>
        idx === i ? { ...v, status: 'fetching' } : v
      ))

      try {
        const response = await fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${videoId}`,
            includeTimestamps: false,
            enableFallback: true,
          }),
        })

        const data = await response.json()

        if (response.ok && data.transcript?.id) {
          fetchedIds.push(data.transcript.id)
          setFetchingVideos(prev => prev.map((v, idx) =>
            idx === i ? { ...v, status: 'success', title: data.transcript.video_title } : v
          ))
        } else {
          setFetchingVideos(prev => prev.map((v, idx) =>
            idx === i ? { ...v, status: 'error', error: data.error || 'Failed to fetch' } : v
          ))
        }
      } catch (error) {
        console.error(`Failed to fetch transcript for ${videoId}:`, error)
        setFetchingVideos(prev => prev.map((v, idx) =>
          idx === i ? { ...v, status: 'error', error: 'Network error' } : v
        ))
      }
    }

    if (fetchedIds.length > 0) {
      wizard.updateData({ transcriptIds: fetchedIds })
    }

    // Force Step1 to refetch transcripts
    setRefreshKey(prev => prev + 1)
    setIsFetchingFromExtension(false)
    setShowFetchSummary(true) // Show summary instead of going directly to wizard
  }

  const handleRetryFailed = async () => {
    const failedVideos = fetchingVideos.filter(v => v.status === 'error')
    if (failedVideos.length === 0) return

    setShowFetchSummary(false)
    setIsFetchingFromExtension(true)

    // Reset failed videos to pending
    setFetchingVideos(prev => prev.map(v =>
      v.status === 'error' ? { ...v, status: 'pending' as const, error: undefined } : v
    ))

    const existingSuccessIds = wizard.data.transcriptIds || []
    const newFetchedIds: string[] = []

    for (const video of failedVideos) {
      const idx = fetchingVideos.findIndex(v => v.videoId === video.videoId)

      // Update to fetching
      setFetchingVideos(prev => prev.map((v, i) =>
        i === idx ? { ...v, status: 'fetching' as const } : v
      ))

      try {
        const response = await fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            includeTimestamps: false,
            enableFallback: true,
          }),
        })

        const data = await response.json()

        if (response.ok && data.transcript?.id) {
          newFetchedIds.push(data.transcript.id)
          setFetchingVideos(prev => prev.map((v, i) =>
            i === idx ? { ...v, status: 'success' as const, title: data.transcript.video_title } : v
          ))
        } else {
          setFetchingVideos(prev => prev.map((v, i) =>
            i === idx ? { ...v, status: 'error' as const, error: data.error || 'Failed to fetch' } : v
          ))
        }
      } catch (error) {
        setFetchingVideos(prev => prev.map((v, i) =>
          i === idx ? { ...v, status: 'error' as const, error: 'Network error' } : v
        ))
      }
    }

    if (newFetchedIds.length > 0) {
      wizard.updateData({ transcriptIds: [...existingSuccessIds, ...newFetchedIds] })
    }

    setRefreshKey(prev => prev + 1)
    setIsFetchingFromExtension(false)
    setShowFetchSummary(true)
  }

  const handleContinueToGenerator = () => {
    setShowFetchSummary(false)
    // Clear URL params to prevent re-fetching on refresh
    router.replace('/generator', { scroll: false })
  }

  const handleGenerate = async () => {
    if (wizard.data.transcriptIds.length === 0) {
      toast.error('Please select at least one transcript')
      return
    }

    setIsGenerating(true)
    setGeneratedContent(null)
    setGeneratedContentId(null)
    setGeneratedImageUrl(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptIds: wizard.data.transcriptIds,
          format: wizard.data.format,
          voice: wizard.data.voice,
          toneProfileId: wizard.data.toneProfileId,
          customInstructions: wizard.data.customInstructions || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setGeneratedContent(data.content)
      setGeneratedContentId(data.id)
      toast.success('Content generated successfully!')

      // Generate image if requested
      if (wizard.data.generateImage && data.id) {
        handleGenerateImage(data.id)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateImage = async (contentId: string) => {
    setIsGeneratingImage(true)

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          style: wizard.data.imageStyle || 'photorealistic',
          mood: wizard.data.imageMood || 'professional',
          aspectRatio: '16:9',
          customPrompt: wizard.data.customImagePrompt || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl)
        toast.success('Image generated!')
      } else {
        toast.error(data.error || 'Image generation failed')
      }
    } catch (error) {
      toast.error('Failed to generate image')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handlePodcastClick = () => {
    if (generatedContentId) {
      router.push(`/podcast?contentId=${generatedContentId}`)
    }
  }

  const handleStartOver = () => {
    wizard.resetWizard()
    setGeneratedContent(null)
    setGeneratedContentId(null)
    setGeneratedImageUrl(null)
  }

  // Show results view after generation
  const showResults = generatedContent !== null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Content Generator
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Transform your video transcripts into engaging content
        </p>
      </div>

      {isFetchingFromExtension ? (
        // Fetching transcripts from Chrome extension
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <Youtube className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Fetching Transcripts
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Getting transcripts from your selected videos...
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            {fetchingVideos.map((video, idx) => (
              <div
                key={video.videoId}
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {video.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                  {video.status === 'fetching' && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  )}
                  {video.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {video.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                {/* Thumbnail */}
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/default.jpg`}
                  alt="Thumbnail"
                  className="w-16 h-12 rounded object-cover flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {video.title || `Video ${idx + 1}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {video.status === 'pending' && 'Waiting...'}
                    {video.status === 'fetching' && 'Fetching transcript...'}
                    {video.status === 'success' && 'Ready!'}
                    {video.status === 'error' && (video.error || 'Failed')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : showFetchSummary ? (
        // Fetch completion summary
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Transcripts Ready
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {fetchingVideos.filter(v => v.status === 'success').length} of {fetchingVideos.length} transcripts fetched successfully
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto mb-8">
            {fetchingVideos.map((video, idx) => (
              <div
                key={video.videoId}
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  video.status === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {video.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                {/* Thumbnail */}
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/default.jpg`}
                  alt="Thumbnail"
                  className="w-16 h-12 rounded object-cover flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {video.title || `Video ${idx + 1}`}
                  </p>
                  <p className={`text-xs ${
                    video.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {video.status === 'success' ? 'Saved to library' : (video.error || 'Failed to fetch')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3">
            {fetchingVideos.some(v => v.status === 'error') && (
              <button
                onClick={handleRetryFailed}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Failed
              </button>
            )}
            <button
              onClick={handleContinueToGenerator}
              disabled={!fetchingVideos.some(v => v.status === 'success')}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                fetchingVideos.some(v => v.status === 'success')
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-400 bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
              }`}
            >
              Continue to Generator
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : showResults ? (
        // Results View
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Content is Ready
            </h2>
            <button
              onClick={handleStartOver}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Generate New Content
            </button>
          </div>

          <ContentResults
            content={generatedContent}
            contentId={generatedContentId}
            isGenerating={false}
            onPodcastClick={handlePodcastClick}
          />

          {/* Generated Image */}
          {(isGeneratingImage || generatedImageUrl) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generated Image
                </h3>
              </div>

              {isGeneratingImage ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-500">Generating image...</p>
                  </div>
                </div>
              ) : generatedImageUrl ? (
                <div className="relative">
                  <img
                    src={generatedImageUrl}
                    alt="Generated content image"
                    className="w-full rounded-lg"
                  />
                  <a
                    href={generatedImageUrl}
                    download="generated-image.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 px-3 py-1.5 bg-white/90 dark:bg-gray-800/90 text-sm rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    Download
                  </a>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        // Wizard View
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <WizardStepIndicator
            currentStep={wizard.currentStep}
            completedSteps={wizard.completedSteps}
            onStepClick={wizard.goToStep}
            canNavigateTo={wizard.canNavigateTo}
          />

          <div className="min-h-[400px]">
            {wizard.currentStep === 1 && (
              <Step1SourceMaterial
                key={refreshKey}
                data={wizard.data}
                updateData={wizard.updateData}
              />
            )}

            {wizard.currentStep === 2 && (
              <Step2ContentFormat
                data={wizard.data}
                updateData={wizard.updateData}
              />
            )}

            {wizard.currentStep === 3 && (
              <Step3VoiceTone
                data={wizard.data}
                updateData={wizard.updateData}
              />
            )}

            {wizard.currentStep === 4 && (
              <Step4ImageExtras
                data={wizard.data}
                updateData={wizard.updateData}
              />
            )}
          </div>

          <WizardNavigation
            currentStep={wizard.currentStep}
            totalSteps={4}
            canGoNext={wizard.canProceed}
            canGoBack={!wizard.isFirstStep}
            onNext={wizard.nextStep}
            onBack={wizard.prevStep}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            isLastStep={wizard.isLastStep}
          />
        </div>
      )}
    </div>
  )
}

export default function GeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <GeneratorContent />
    </Suspense>
  )
}
