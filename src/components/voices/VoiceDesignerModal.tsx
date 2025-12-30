'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Wand2, Play, Pause, Loader2, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface VoicePreview {
  generated_voice_id: string
  audio_base64: string
  description: string
}

interface VoiceDesignerModalProps {
  isOpen: boolean
  onClose: () => void
  onVoiceSaved: () => void
}

const exampleDescriptions = [
  "A warm, friendly male voice with a slight British accent, middle-aged, conversational tone",
  "A young, energetic female voice with an American accent, upbeat and enthusiastic",
  "A deep, authoritative male voice, professional and calm, perfect for narration",
  "A soft, soothing female voice with a gentle Australian accent, mature and wise",
]

export function VoiceDesignerModal({
  isOpen,
  onClose,
  onVoiceSaved,
}: VoiceDesignerModalProps) {
  const [description, setDescription] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [previews, setPreviews] = useState<VoicePreview[]>([])
  const [selectedPreview, setSelectedPreview] = useState<VoicePreview | null>(null)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [voiceName, setVoiceName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSaveDialog) {
          setShowSaveDialog(false)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
      stopAudio()
    }
  }, [isOpen, showSaveDialog, onClose])

  const handleGenerate = async () => {
    if (description.trim().length < 10) {
      toast.error('Please provide a more detailed description (at least 10 characters)')
      return
    }

    setGenerating(true)
    setPreviews([])
    setSelectedPreview(null)

    try {
      const response = await fetch('/api/voices/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          preview_text: previewText.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate voice')
      }

      setPreviews(data.previews || [])
      if (data.previews?.length > 0) {
        toast.success(`Generated ${data.previews.length} voice preview(s)`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate voice')
    } finally {
      setGenerating(false)
    }
  }

  const playPreview = (preview: VoicePreview, index: number) => {
    if (playingIndex === index) {
      stopAudio()
      return
    }

    stopAudio()

    const audio = new Audio(`data:audio/mpeg;base64,${preview.audio_base64}`)
    audio.onended = () => setPlayingIndex(null)
    audio.onerror = () => setPlayingIndex(null)
    audio.play()
    audioRef.current = audio
    setPlayingIndex(index)
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingIndex(null)
  }

  const handleSelectForSave = (preview: VoicePreview) => {
    setSelectedPreview(preview)
    setShowSaveDialog(true)
    setVoiceName('')
  }

  const handleSaveVoice = async () => {
    if (!selectedPreview || !voiceName.trim()) {
      toast.error('Please enter a name for your voice')
      return
    }

    setSaving(true)

    try {
      // First, save the designed voice to ElevenLabs
      const designResponse = await fetch('/api/voices/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generated_voice_id: selectedPreview.generated_voice_id,
          name: voiceName.trim(),
          description: description.trim(),
        }),
      })

      const designData = await designResponse.json()

      if (!designResponse.ok) {
        throw new Error(designData.error || 'Failed to save voice to ElevenLabs')
      }

      // Then, save to user's profile
      const saveResponse = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: designData.voice.voice_id,
          name: voiceName.trim(),
          description: description.trim(),
          source: 'designed',
          design_prompt: description.trim(),
          preview_url: designData.voice.preview_url || null,
        }),
      })

      const saveData = await saveResponse.json()

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Failed to save to profile')
      }

      toast.success('Voice saved to your profile!')
      setShowSaveDialog(false)
      setPreviews([])
      setDescription('')
      setSelectedPreview(null)
      onVoiceSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save voice')
    } finally {
      setSaving(false)
    }
  }

  const useExampleDescription = (example: string) => {
    setDescription(example)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={showSaveDialog ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
              Voice Designer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Describe your ideal voice
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., A warm, friendly male voice with a slight British accent, middle-aged, conversational tone..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Try:</span>
              {exampleDescriptions.slice(0, 2).map((example, i) => (
                <button
                  key={i}
                  onClick={() => useExampleDescription(example)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors truncate max-w-[200px]"
                >
                  {example.slice(0, 40)}...
                </button>
              ))}
            </div>
          </div>

          {/* Optional Preview Text */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview text <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Text to speak in the preview (default: Hello, welcome to our podcast...)"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || description.trim().length < 10}
            className="w-full py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Previews...
              </>
            ) : previews.length > 0 ? (
              <>
                <RefreshCw className="w-5 h-5" />
                Regenerate Voices
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Voice Previews
              </>
            )}
          </button>

          {/* Previews */}
          {previews.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Generated Previews
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Listen to each preview and save the one you like best
              </p>
              <div className="space-y-3">
                {previews.map((preview, index) => (
                  <div
                    key={preview.generated_voice_id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                  >
                    <button
                      onClick={() => playPreview(preview, index)}
                      className={`p-3 rounded-full transition-colors ${
                        playingIndex === index
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      {playingIndex === index ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Voice Option {index + 1}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {preview.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectForSave(preview)}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Dialog Overlay */}
        {showSaveDialog && selectedPreview && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 rounded-xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Name Your Voice
              </h3>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., Podcast Host Voice"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVoice}
                  disabled={saving || !voiceName.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Voice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
