'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Sparkles, Loader2, Image as ImageIcon, Copy, Check, FileText, ChevronDown, Send, RefreshCw, Mic, Download, Play, Pause, Volume2, Library, Wand2, ExternalLink } from 'lucide-react'
import { SkeletonContentGenerator } from '@/components/ui/Skeleton'
import { VoiceLibraryModal, VoiceDesignerModal } from '@/components/voices'

interface Transcript {
  id: string
  title: string
  videoId: string
  createdAt: string
}

interface ToneProfile {
  id: string
  name: string
}

interface SEOData {
  title: string
  description: string
  keywords: string[]
  readabilityScore: number
  readabilityLevel: string
}

interface PodcastSegment {
  speaker: string
  text: string
  emotion?: string
}

interface PodcastScript {
  title: string
  description: string
  segments: PodcastSegment[]
  keyTakeaways: string[]
}

interface PodcastJob {
  id: string
  status: string
  progress: number
  script?: PodcastScript
  audioUrl?: string
  duration?: number
  error?: string
}

interface SavedVoice {
  id: string
  voice_id: string
  name: string
  description: string | null
  gender: string | null
  accent: string | null
  preview_url: string | null
  source: 'library' | 'designed' | 'cloned'
  is_default_host1: boolean
  is_default_host2: boolean
}

const podcastDurations = [
  { id: 'short', label: '3-5 min', description: 'Quick overview' },
  { id: 'medium', label: '8-12 min', description: 'Standard episode' },
  { id: 'long', label: '15-20 min', description: 'Deep dive' },
]

const podcastTones = [
  { id: 'casual', label: 'Casual' },
  { id: 'professional', label: 'Professional' },
  { id: 'educational', label: 'Educational' },
]

const contentFormats = [
  { id: 'linkedin', label: 'LinkedIn Post' },
  { id: 'twitter', label: 'Twitter/X Thread' },
  { id: 'blog-short', label: 'Blog (Short)' },
  { id: 'blog-long', label: 'Blog (Long Form)' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'youtube-script', label: 'YouTube Script' },
  { id: 'youtube-short', label: 'YouTube Short Script' },
  { id: 'tiktok', label: 'TikTok Script' },
  { id: 'instagram-reel', label: 'Instagram Reel' },
  { id: 'explainer-video', label: 'Explainer Video' },
]

const voiceStyles = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'humorous', label: 'Humorous' },
  { id: 'empathetic', label: 'Empathetic' },
  { id: 'direct', label: 'Direct & Bold' },
  { id: 'custom', label: 'Clone My Tone' },
]

const imageStyles = [
  { id: 'photorealistic', label: 'Photorealistic' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'infographic', label: 'Infographic' },
  { id: '3d-render', label: '3D Render' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'hand-drawn', label: 'Hand Drawn' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'oil-painting', label: 'Oil Painting' },
  { id: 'corporate-tech', label: 'Corporate Tech' },
]

const imageMoods = [
  { id: 'professional', label: 'Professional' },
  { id: 'vibrant', label: 'Vibrant' },
  { id: 'dark-moody', label: 'Dark & Moody' },
  { id: 'soft-light', label: 'Soft Light' },
  { id: 'futuristic', label: 'Futuristic' },
]

export default function GeneratorPage() {
  const searchParams = useSearchParams()

  // Source Selection
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loadingTranscripts, setLoadingTranscripts] = useState(true)
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([])
  const [showTranscriptSelector, setShowTranscriptSelector] = useState(false)

  // Auto-fetch from extension
  const [autoFetching, setAutoFetching] = useState(false)
  const [autoFetchProgress, setAutoFetchProgress] = useState<{ current: number; total: number } | null>(null)
  const [fromExtension, setFromExtension] = useState(false)

  // Tone Profiles
  const [toneProfiles, setToneProfiles] = useState<ToneProfile[]>([])
  const [selectedToneProfile, setSelectedToneProfile] = useState<string | null>(null)

  // Content Options
  const [format, setFormat] = useState('linkedin')
  const [voice, setVoice] = useState('professional')
  const [customInstructions, setCustomInstructions] = useState('')

  // Image Options
  const [generateImage, setGenerateImage] = useState(true)
  const [imageStyle, setImageStyle] = useState('photorealistic')
  const [imageMood, setImageMood] = useState('professional')
  const [customImagePrompt, setCustomImagePrompt] = useState('')

  // Generation State
  const [loading, setLoading] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [generatedContentId, setGeneratedContentId] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState('')
  const [seoData, setSeoData] = useState<SEOData | null>(null)
  const [analyzingSeo, setAnalyzingSeo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Podcast State
  const [showPodcastOptions, setShowPodcastOptions] = useState(false)
  const [podcastDuration, setPodcastDuration] = useState('medium')
  const [podcastTone, setPodcastTone] = useState('casual')
  const [host1Name, setHost1Name] = useState('Alex')
  const [host2Name, setHost2Name] = useState('Jamie')
  const [generatingPodcast, setGeneratingPodcast] = useState(false)
  const [podcastJob, setPodcastJob] = useState<PodcastJob | null>(null)
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null)

  // Voice Selection State
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(true)
  const [host1Voice, setHost1Voice] = useState<string | null>(null)
  const [host2Voice, setHost2Voice] = useState<string | null>(null)
  const [generateAudio, setGenerateAudio] = useState(false)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false)
  const [showVoiceDesigner, setShowVoiceDesigner] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const contentRef = useRef<HTMLPreElement>(null)

  // Fetch transcripts on mount
  useEffect(() => {
    fetchTranscripts()
    fetchToneProfiles()
    fetchSavedVoices()
  }, [])

  // Handle URL parameters from Chrome extension
  useEffect(() => {
    const videos = searchParams.get('videos')
    const urlFormat = searchParams.get('format')
    const urlInstructions = searchParams.get('instructions')

    if (videos) {
      setFromExtension(true)
      const videoIds = videos.split(',').slice(0, 3)

      // Set format if provided
      if (urlFormat && contentFormats.some(f => f.id === urlFormat)) {
        setFormat(urlFormat)
      }

      // Set instructions if provided
      if (urlInstructions) {
        setCustomInstructions(decodeURIComponent(urlInstructions))
      }

      // Auto-fetch transcripts
      handleAutoFetch(videoIds)
    }
  }, [searchParams])

  const handleAutoFetch = async (videoIds: string[]) => {
    setAutoFetching(true)
    setAutoFetchProgress({ current: 0, total: videoIds.length })

    try {
      // Convert video IDs to URLs
      const urls = videoIds.map(id => `https://www.youtube.com/watch?v=${id}`)

      const response = await fetch('/api/transcripts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transcripts')
      }

      // Refresh transcripts list
      await fetchTranscripts()

      // Auto-select the fetched transcripts
      if (data.transcripts && data.transcripts.length > 0) {
        const newIds = data.transcripts.map((t: { id: string }) => t.id)
        setSelectedTranscripts(newIds)
        toast.success(`Fetched ${data.successful} transcript${data.successful > 1 ? 's' : ''} from extension`)
      }

      if (data.failed && data.failed.length > 0) {
        toast.error(`Failed to fetch ${data.failed.length} video${data.failed.length > 1 ? 's' : ''}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transcripts'
      toast.error(message)
    } finally {
      setAutoFetching(false)
      setAutoFetchProgress(null)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const fetchTranscripts = async () => {
    try {
      const response = await fetch('/api/transcripts')
      const data = await response.json()
      setTranscripts(data.transcripts || [])
    } catch (err) {
      console.error('Failed to fetch transcripts:', err)
    } finally {
      setLoadingTranscripts(false)
    }
  }

  const fetchToneProfiles = async () => {
    try {
      const response = await fetch('/api/tones')
      const data = await response.json()
      setToneProfiles(data.profiles || [])
    } catch (err) {
      console.error('Failed to fetch tone profiles:', err)
    }
  }

  const fetchSavedVoices = async () => {
    try {
      const response = await fetch('/api/voices')
      const data = await response.json()
      const voices = data.voices || []
      setSavedVoices(voices)

      // Set default voices if they exist
      const defaultHost1 = voices.find((v: SavedVoice) => v.is_default_host1)
      const defaultHost2 = voices.find((v: SavedVoice) => v.is_default_host2)
      if (defaultHost1) setHost1Voice(defaultHost1.voice_id)
      if (defaultHost2) setHost2Voice(defaultHost2.voice_id)
    } catch (err) {
      console.error('Failed to fetch voices:', err)
    } finally {
      setLoadingVoices(false)
    }
  }

  const playVoicePreview = (voice: SavedVoice) => {
    if (!voice.preview_url) return

    if (playingVoiceId === voice.voice_id) {
      stopAudio()
      return
    }

    stopAudio()

    const audio = new Audio(voice.preview_url)
    audio.onended = () => setPlayingVoiceId(null)
    audio.onerror = () => setPlayingVoiceId(null)
    audio.play()
    audioRef.current = audio
    setPlayingVoiceId(voice.voice_id)
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoiceId(null)
  }

  const handleSaveVoiceFromLibrary = async (voice: {
    voice_id: string
    name: string
    preview_url: string | null
    gender: string | null
    accent: string | null
    age: string | null
    description: string | null
  }) => {
    try {
      const response = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: voice.voice_id,
          name: voice.name,
          description: voice.description,
          gender: voice.gender,
          accent: voice.accent,
          age: voice.age,
          preview_url: voice.preview_url,
          source: 'library',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save voice')
      }

      setSavedVoices((prev) => [data.voice, ...prev])
      toast.success(`"${voice.name}" saved to your voices`)
    } catch (err) {
      if (err instanceof Error && err.message.includes('already saved')) {
        toast.info('Voice already saved to your profile')
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to save voice')
      }
    }
  }

  const toggleTranscriptSelection = (id: string) => {
    setSelectedTranscripts((prev) => {
      if (prev.includes(id)) {
        return prev.filter((t) => t !== id)
      }
      if (prev.length >= 3) {
        return prev // Max 3 transcripts
      }
      return [...prev, id]
    })
  }

  const handleGenerate = async () => {
    if (selectedTranscripts.length === 0) {
      toast.error('Please select at least one transcript')
      return
    }

    setLoading(true)
    setError(null)
    setGeneratedContent('')
    setGeneratedContentId(null)
    setGeneratedImage('')
    setSeoData(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptIds: selectedTranscripts,
          format,
          voice,
          toneProfileId: voice === 'custom' ? selectedToneProfile : undefined,
          customInstructions: customInstructions || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Content generation failed')
      }

      setGeneratedContent(data.content)
      setGeneratedContentId(data.id)
      toast.success('Content generated successfully')

      // Auto-generate image if enabled
      if (generateImage && data.id) {
        await handleGenerateImage(data.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateImage = async (contentId?: string) => {
    const id = contentId || generatedContentId
    if (!id) return

    setGeneratingImage(true)

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: id,
          style: imageStyle,
          mood: imageMood,
          customPrompt: customImagePrompt || undefined,
          aspectRatio: '16:9',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Image generation failed')
      }

      setGeneratedImage(data.imageUrl)
      toast.success('Image generated successfully')
    } catch (err) {
      toast.error('Image generation failed')
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleAnalyzeSeo = async () => {
    if (!generatedContentId || !generatedContent) return

    setAnalyzingSeo(true)

    try {
      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: generatedContentId,
          content: generatedContent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'SEO analysis failed')
      }

      setSeoData(data)
      toast.success('SEO analysis complete')
    } catch (err) {
      toast.error('SEO analysis failed')
    } finally {
      setAnalyzingSeo(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGeneratePodcast = async () => {
    if (!generatedContentId) {
      toast.error('Generate content first before creating a podcast')
      return
    }

    setGeneratingPodcast(true)
    setPodcastJob(null)

    try {
      const response = await fetch('/api/generate/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: generatedContentId,
          targetDuration: podcastDuration,
          tone: podcastTone,
          hostNames: { host1: host1Name, host2: host2Name },
          includeIntro: true,
          includeOutro: true,
          ttsProvider: 'none', // Script only for now
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Podcast generation failed')
      }

      setPodcastJob(data.job)
      toast.success('Podcast script generated successfully')

      // If audio generation is enabled, start it
      if (generateAudio && host1Voice && host2Voice && data.job?.id) {
        await handleGenerateAudio(data.job.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Podcast generation failed'
      toast.error(message)
    } finally {
      setGeneratingPodcast(false)
    }
  }

  const handleGenerateAudio = async (jobId?: string) => {
    const id = jobId || podcastJob?.id
    if (!id) {
      toast.error('No podcast job to generate audio for')
      return
    }

    if (!host1Voice || !host2Voice) {
      toast.error('Please select voices for both hosts')
      return
    }

    // Update job status locally
    setPodcastJob(prev => prev ? { ...prev, status: 'generating_audio', progress: 0 } : null)

    try {
      const response = await fetch(`/api/generate/podcast/${id}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceHost1: host1Voice,
          voiceHost2: host2Voice,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Audio generation failed')
      }

      setPodcastJob(data.job)
      toast.success('Podcast audio generated successfully!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audio generation failed'
      toast.error(message)
      // Reset job status on error
      setPodcastJob(prev => prev ? { ...prev, status: 'complete' } : null)
    }
  }

  const handleDownloadScript = (format: 'json' | 'txt' | 'srt') => {
    if (!podcastJob?.id) return

    const url = `/api/generate/podcast/${podcastJob.id}?export=${format}`
    window.open(url, '_blank')
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Content Generator
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Transform your transcripts into engaging, original content with AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Extension Banner */}
          {fromExtension && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4 flex items-center gap-3">
              <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Sent from YTS Chrome Extension
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {autoFetching ? 'Fetching transcripts...' : 'Transcripts loaded and ready to generate'}
                </p>
              </div>
            </div>
          )}

          {/* Source Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Source Material
            </h2>

            {autoFetching ? (
              <div className="p-8 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg text-center">
                <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                <p className="mt-4 text-gray-700 dark:text-gray-300 font-medium">
                  Fetching transcripts from YouTube...
                </p>
                {autoFetchProgress && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Processing {autoFetchProgress.total} video{autoFetchProgress.total > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            ) : loadingTranscripts ? (
              <SkeletonContentGenerator />
            ) : transcripts.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">
                  No transcripts available. Fetch some transcripts first.
                </p>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setShowTranscriptSelector(!showTranscriptSelector)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {selectedTranscripts.length === 0
                      ? 'Select transcripts (max 3)'
                      : `${selectedTranscripts.length} transcript(s) selected`}
                  </span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${showTranscriptSelector ? 'rotate-180' : ''}`} />
                </button>

                {showTranscriptSelector && (
                  <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                    {transcripts.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selectedTranscripts.includes(t.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTranscripts.includes(t.id)}
                          onChange={() => toggleTranscriptSelection(t.id)}
                          disabled={!selectedTranscripts.includes(t.id) && selectedTranscripts.length >= 3}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
                            {t.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content Format */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Content Format
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {contentFormats.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFormat(item.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    format === item.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Style */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Voice Style
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {voiceStyles.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setVoice(item.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    voice === item.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Tone Profile Selection */}
            {voice === 'custom' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Tone Profile
                </label>
                {toneProfiles.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No tone profiles available. Create one in Settings.
                  </p>
                ) : (
                  <select
                    value={selectedToneProfile || ''}
                    onChange={(e) => setSelectedToneProfile(e.target.value || null)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a profile...</option>
                    {toneProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Image Generation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Image Generation
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateImage}
                  onChange={(e) => setGenerateImage(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Enable</span>
              </label>
            </div>
            {generateImage && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Style
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {imageStyles.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setImageStyle(item.id)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          imageStyle === item.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mood
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {imageMoods.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setImageMood(item.id)}
                        className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          imageMood === item.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Prompt (optional)
                  </label>
                  <input
                    type="text"
                    value={customImagePrompt}
                    onChange={(e) => setCustomImagePrompt(e.target.value)}
                    placeholder="Describe the image you want..."
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Custom Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Custom Instructions
            </h2>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add any specific instructions for the AI..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || autoFetching || selectedTranscripts.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : autoFetching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Fetching Transcripts...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Content
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
          {/* Generated Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Generated Content
              </h2>
              {generatedContent && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAnalyzeSeo}
                    disabled={analyzingSeo}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-colors"
                  >
                    {analyzingSeo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    SEO Analysis
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            {generatedContent ? (
              <div className="prose dark:prose-invert max-w-none">
                <pre
                  ref={contentRef}
                  className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans"
                >
                  {generatedContent}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Generated content will appear here</p>
                </div>
              </div>
            )}
          </div>

          {/* SEO Analysis */}
          {seoData && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                SEO Analysis
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Suggested Title
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-white">{seoData.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Meta Description
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-white text-sm">{seoData.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Keywords
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {seoData.keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Readability
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {seoData.readabilityScore.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({seoData.readabilityLevel})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Podcast Generation */}
          {generatedContentId && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <button
                onClick={() => setShowPodcastOptions(!showPodcastOptions)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Generate Podcast
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Convert to a two-host conversation script
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showPodcastOptions ? 'rotate-180' : ''}`} />
              </button>

              {showPodcastOptions && (
                <div className="mt-6 space-y-4">
                  {/* Duration Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Episode Length
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {podcastDurations.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setPodcastDuration(item.id)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            podcastDuration === item.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <p className="text-xs opacity-80">{item.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Conversation Tone
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {podcastTones.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setPodcastTone(item.id)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            podcastTone === item.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Host Names */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Host 1 (Skeptic)
                      </label>
                      <input
                        type="text"
                        value={host1Name}
                        onChange={(e) => setHost1Name(e.target.value)}
                        maxLength={20}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Host 2 (Expert)
                      </label>
                      <input
                        type="text"
                        value={host2Name}
                        onChange={(e) => setHost2Name(e.target.value)}
                        maxLength={20}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Voice Selection */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Voice Selection
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowVoiceLibrary(true)}
                          className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        >
                          <Library className="w-3 h-3 inline mr-1" />
                          Library
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVoiceDesigner(true)}
                          className="text-xs px-2 py-1 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                        >
                          <Wand2 className="w-3 h-3 inline mr-1" />
                          Design
                        </button>
                      </div>
                    </div>

                    {loadingVoices ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">Loading voices...</div>
                    ) : savedVoices.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        No voices saved. Browse the library or design a custom voice to enable audio generation.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {/* Host 1 Voice */}
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {host1Name}'s Voice
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={host1Voice || ''}
                              onChange={(e) => setHost1Voice(e.target.value || null)}
                              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Select voice...</option>
                              {savedVoices.map((v) => (
                                <option key={v.voice_id} value={v.voice_id}>
                                  {v.name} {v.gender ? `(${v.gender})` : ''}
                                </option>
                              ))}
                            </select>
                            {host1Voice && (
                              <button
                                type="button"
                                onClick={() => {
                                  const voice = savedVoices.find((v) => v.voice_id === host1Voice)
                                  if (voice) playVoicePreview(voice)
                                }}
                                className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                                title="Preview voice"
                              >
                                {playingVoiceId === host1Voice ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Host 2 Voice */}
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {host2Name}'s Voice
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={host2Voice || ''}
                              onChange={(e) => setHost2Voice(e.target.value || null)}
                              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">Select voice...</option>
                              {savedVoices.map((v) => (
                                <option key={v.voice_id} value={v.voice_id}>
                                  {v.name} {v.gender ? `(${v.gender})` : ''}
                                </option>
                              ))}
                            </select>
                            {host2Voice && (
                              <button
                                type="button"
                                onClick={() => {
                                  const voice = savedVoices.find((v) => v.voice_id === host2Voice)
                                  if (voice) playVoicePreview(voice)
                                }}
                                className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                                title="Preview voice"
                              >
                                {playingVoiceId === host2Voice ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Generate Audio Toggle */}
                    {savedVoices.length > 0 && (
                      <label className="flex items-center gap-3 mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={generateAudio}
                          onChange={(e) => setGenerateAudio(e.target.checked)}
                          disabled={!host1Voice || !host2Voice}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Generate Audio
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {!host1Voice || !host2Voice
                              ? 'Select voices for both hosts to enable audio'
                              : 'Create MP3 audio using ElevenLabs (uses API credits)'}
                          </p>
                        </div>
                        <Volume2 className={`w-4 h-4 ${generateAudio ? 'text-purple-600' : 'text-gray-400'}`} />
                      </label>
                    )}
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGeneratePodcast}
                    disabled={generatingPodcast}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                  >
                    {generatingPodcast ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Script...
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Generate Podcast Script
                      </>
                    )}
                  </button>

                  {/* Podcast Script Output */}
                  {podcastJob?.script && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {podcastJob.script.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {podcastJob.script.segments.length} segments &bull; ~{formatDuration(podcastJob.duration || 0)} estimated
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadScript('txt')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                          >
                            <Download className="w-4 h-4" />
                            TXT
                          </button>
                          <button
                            onClick={() => handleDownloadScript('srt')}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                          >
                            <Download className="w-4 h-4" />
                            SRT
                          </button>
                        </div>
                      </div>

                      {/* Audio Player / Generation Status */}
                      {podcastJob.audioUrl ? (
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                              <Volume2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                Podcast Audio Ready
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Duration: {formatDuration(podcastJob.duration || 0)}
                              </p>
                            </div>
                            <a
                              href={podcastJob.audioUrl}
                              download={`podcast_${podcastJob.id}.mp3`}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Download MP3
                            </a>
                          </div>
                          <audio
                            controls
                            className="w-full"
                            src={podcastJob.audioUrl}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : podcastJob.status === 'generating_audio' || podcastJob.status === 'stitching' ? (
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-3 mb-3">
                            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {podcastJob.status === 'stitching' ? 'Finalizing Audio...' : 'Generating Audio...'}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {podcastJob.status === 'stitching'
                                  ? 'Almost done! Combining all segments...'
                                  : 'Creating voice audio with ElevenLabs...'}
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${podcastJob.progress || 0}%` }}
                            />
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 text-right">
                            {podcastJob.progress || 0}%
                          </p>
                        </div>
                      ) : savedVoices.length > 0 && host1Voice && host2Voice ? (
                        <div className="mb-4">
                          <button
                            onClick={() => handleGenerateAudio()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-colors"
                          >
                            <Volume2 className="w-4 h-4" />
                            Generate Audio with Selected Voices
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                            Uses ElevenLabs API credits
                          </p>
                        </div>
                      ) : null}

                      {/* Script Preview */}
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {podcastJob.script.segments.slice(0, 10).map((segment, idx) => (
                          <div
                            key={idx}
                            onClick={() => setExpandedSegment(expandedSegment === idx ? null : idx)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              segment.speaker === host1Name
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                                : 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-medium ${
                                segment.speaker === host1Name
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-green-700 dark:text-green-400'
                              }`}>
                                {segment.speaker}
                              </span>
                              {segment.emotion && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({segment.emotion})
                                </span>
                              )}
                            </div>
                            <p className={`text-sm text-gray-700 dark:text-gray-300 ${
                              expandedSegment === idx ? '' : 'line-clamp-2'
                            }`}>
                              {segment.text}
                            </p>
                          </div>
                        ))}
                        {podcastJob.script.segments.length > 10 && (
                          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                            +{podcastJob.script.segments.length - 10} more segments (download full script)
                          </p>
                        )}
                      </div>

                      {/* Key Takeaways */}
                      {podcastJob.script.keyTakeaways.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Key Takeaways
                          </h4>
                          <ul className="space-y-1">
                            {podcastJob.script.keyTakeaways.map((takeaway, idx) => (
                              <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                <span className="text-purple-500">•</span>
                                {takeaway}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generated Image */}
          {generateImage && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generated Image
                </h2>
                {generatedContentId && !generatingImage && (
                  <button
                    onClick={() => handleGenerateImage()}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                )}
              </div>
              {generatingImage ? (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Generating image...
                    </p>
                  </div>
                </div>
              ) : generatedImage ? (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <img
                    src={generatedImage}
                    alt="Generated content illustration"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Generated image will appear here</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Voice Library Modal */}
      <VoiceLibraryModal
        isOpen={showVoiceLibrary}
        onClose={() => setShowVoiceLibrary(false)}
        onSaveVoice={handleSaveVoiceFromLibrary}
        savedVoiceIds={savedVoices.map((v) => v.voice_id)}
      />

      {/* Voice Designer Modal */}
      <VoiceDesignerModal
        isOpen={showVoiceDesigner}
        onClose={() => setShowVoiceDesigner(false)}
        onVoiceSaved={() => {
          fetchSavedVoices()
          setShowVoiceDesigner(false)
        }}
      />
    </div>
  )
}
