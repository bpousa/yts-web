'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Image as ImageIcon } from 'lucide-react'

import { useWizard } from '@/hooks/useWizard'
import { WizardStepIndicator } from '@/components/generator/WizardStepIndicator'
import { WizardNavigation } from '@/components/generator/WizardNavigation'
import { Step1SourceMaterial } from '@/components/generator/steps/Step1SourceMaterial'
import { Step2ContentFormat } from '@/components/generator/steps/Step2ContentFormat'
import { Step3VoiceTone } from '@/components/generator/steps/Step3VoiceTone'
import { Step4ImageExtras } from '@/components/generator/steps/Step4ImageExtras'
import { ContentResults } from '@/components/generator/ContentResults'

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
    toast.info(`Fetching ${videoIds.length} transcript(s) from extension...`)

    const fetchedIds: string[] = []

    for (const videoId of videoIds.slice(0, 3)) {
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
        }
      } catch (error) {
        console.error(`Failed to fetch transcript for ${videoId}:`, error)
      }
    }

    if (fetchedIds.length > 0) {
      wizard.updateData({ transcriptIds: fetchedIds })
      toast.success(`Fetched ${fetchedIds.length} transcript(s)`)
    }
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
      if (wizard.data.generateImage) {
        handleGenerateImage(data.content)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateImage = async (content: string) => {
    setIsGeneratingImage(true)

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          style: wizard.data.imageStyle,
          mood: wizard.data.imageMood,
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

      {showResults ? (
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
