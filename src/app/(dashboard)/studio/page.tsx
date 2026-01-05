'use client'

import { useState } from 'react'
import { Wand2, Play, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import ScriptInput from '@/components/studio/ScriptInput'
import VoiceSelector from '@/components/studio/VoiceSelector'
import ScriptPreview from '@/components/studio/ScriptPreview'

interface CleanedSegment {
  speaker: string
  text: string
  originalText: string
  hasChanges: boolean
  lineNumber: number
}

interface CleanupResponse {
  mode: 'single' | 'podcast'
  speakers: string[]
  segments: CleanedSegment[]
  estimatedDuration: number
  estimatedDurationFormatted: string
  totalSegments: number
  segmentsWithChanges: number
}

type Step = 'input' | 'preview' | 'generating' | 'complete'

export default function StudioPage() {
  const [script, setScript] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup response
  const [cleanupData, setCleanupData] = useState<CleanupResponse | null>(null)

  // Voice selections: speaker name -> { voiceId, voiceName }
  const [voiceSelections, setVoiceSelections] = useState<Record<string, { id: string; name: string }>>({})

  // Generated audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [generationProgress, setGenerationProgress] = useState('')

  const handleCleanup = async () => {
    if (!script.trim()) {
      setError('Please enter a script')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/scripts/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, fixTypos: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process script')
      }

      const data: CleanupResponse = await response.json()
      setCleanupData(data)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process script')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVoiceSelect = (speaker: string, voiceId: string, voiceName: string) => {
    setVoiceSelections(prev => ({
      ...prev,
      [speaker]: { id: voiceId, name: voiceName },
    }))
  }

  const handleSegmentEdit = (index: number, newText: string) => {
    if (!cleanupData) return

    const updatedSegments = [...cleanupData.segments]
    updatedSegments[index] = {
      ...updatedSegments[index],
      text: newText,
      hasChanges: newText !== updatedSegments[index].originalText,
    }

    setCleanupData({
      ...cleanupData,
      segments: updatedSegments,
    })
  }

  const allVoicesSelected = cleanupData?.speakers.every(speaker => voiceSelections[speaker]?.id) ?? false

  const handleGenerate = async () => {
    if (!cleanupData || !allVoicesSelected) return

    setStep('generating')
    setError(null)
    setGenerationProgress('Preparing audio generation...')

    try {
      // Build voice map
      const voiceMap: Record<string, string> = {}
      for (const speaker of cleanupData.speakers) {
        voiceMap[speaker] = voiceSelections[speaker].id
      }

      // Build segments for API
      const segments = cleanupData.segments.map(s => ({
        speaker: s.speaker,
        text: s.text,
      }))

      setGenerationProgress(`Generating ${segments.length} segments...`)

      const response = await fetch('/api/scripts/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          voiceMap,
          title: `Script - ${new Date().toLocaleDateString()}`,
          saveToLibrary: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Audio generation failed'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // Get audio blob
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setStep('complete')
      setGenerationProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio')
      setStep('preview')
      setGenerationProgress('')
    }
  }

  const handleDownload = () => {
    if (!audioUrl) return

    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `script-audio-${Date.now()}.mp3`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleStartOver = () => {
    setScript('')
    setStep('input')
    setCleanupData(null)
    setVoiceSelections({})
    setAudioUrl(null)
    setError(null)
  }

  const speakerColors = ['blue', 'green'] as const

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Script Studio
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Upload your script, select voices, and generate professional audio
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { key: 'input', label: 'Upload Script' },
          { key: 'preview', label: 'Preview & Edit' },
          { key: 'generating', label: 'Generate' },
          { key: 'complete', label: 'Complete' },
        ].map((s, i) => {
          const isActive = s.key === step
          const isPast = ['input', 'preview', 'generating', 'complete'].indexOf(step) > i

          return (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isPast
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {isPast ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span
                className={`ml-2 text-sm ${
                  isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500'
                }`}
              >
                {s.label}
              </span>
              {i < 3 && (
                <div
                  className={`w-12 h-0.5 mx-4 ${
                    isPast ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Script Input */}
      {step === 'input' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <ScriptInput
              value={script}
              onChange={setScript}
              disabled={isProcessing}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCleanup}
              disabled={!script.trim() || isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Clean Up & Preview
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Voice Selection */}
      {step === 'preview' && cleanupData && (
        <div className="space-y-6">
          {/* Voice Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Voices
            </h2>
            <div className={`grid gap-4 ${cleanupData.speakers.length > 1 ? 'md:grid-cols-2' : ''}`}>
              {cleanupData.speakers.map((speaker, index) => (
                <VoiceSelector
                  key={speaker}
                  speakerName={speaker}
                  selectedVoiceId={voiceSelections[speaker]?.id || null}
                  onVoiceSelect={(voiceId, voiceName) => handleVoiceSelect(speaker, voiceId, voiceName)}
                  speakerColor={speakerColors[index % speakerColors.length]}
                />
              ))}
            </div>
          </div>

          {/* Script Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <ScriptPreview
              segments={cleanupData.segments}
              speakers={cleanupData.speakers}
              estimatedDuration={cleanupData.estimatedDurationFormatted}
              onSegmentEdit={handleSegmentEdit}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('input')}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              ← Back to Edit
            </button>
            <button
              onClick={handleGenerate}
              disabled={!allVoicesSelected}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Play className="w-5 h-5" />
              Generate Audio
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Generating */}
      {step === 'generating' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Generating Audio
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {generationProgress || 'This may take a few minutes...'}
          </p>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && audioUrl && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Audio Generated Successfully!
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Your script has been converted to audio and saved to your library.
              </p>
            </div>

            {/* Audio Player */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <audio
                src={audioUrl}
                controls
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Download className="w-5 h-5" />
                Download MP3
              </button>
              <button
                onClick={handleStartOver}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
