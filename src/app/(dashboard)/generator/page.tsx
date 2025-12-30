'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Sparkles, Loader2, Image as ImageIcon, Copy, Check, FileText, ChevronDown, Send, RefreshCw } from 'lucide-react'
import { SkeletonContentGenerator } from '@/components/ui/Skeleton'

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
  // Source Selection
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loadingTranscripts, setLoadingTranscripts] = useState(true)
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([])
  const [showTranscriptSelector, setShowTranscriptSelector] = useState(false)

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

  const contentRef = useRef<HTMLPreElement>(null)

  // Fetch transcripts on mount
  useEffect(() => {
    fetchTranscripts()
    fetchToneProfiles()
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
          {/* Source Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Source Material
            </h2>

            {loadingTranscripts ? (
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
            disabled={loading || selectedTranscripts.length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
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
    </div>
  )
}
