'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Image as ImageIcon, Copy, Check } from 'lucide-react'

const contentFormats = [
  { id: 'linkedin', label: 'LinkedIn Post' },
  { id: 'twitter', label: 'Twitter/X Thread' },
  { id: 'blog-short', label: 'Blog (Short)' },
  { id: 'blog-long', label: 'Blog (Long Form)' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'youtube-script', label: 'YouTube Script' },
  { id: 'tiktok', label: 'TikTok Script' },
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
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'corporate-tech', label: 'Corporate Tech' },
]

export default function GeneratorPage() {
  const [selectedTranscripts, setSelectedTranscripts] = useState<string[]>([])
  const [format, setFormat] = useState('linkedin')
  const [voice, setVoice] = useState('professional')
  const [customInstructions, setCustomInstructions] = useState('')
  const [generateImage, setGenerateImage] = useState(true)
  const [imageStyle, setImageStyle] = useState('photorealistic')
  const [loading, setLoading] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [generatedImage, setGeneratedImage] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    // TODO: Implement content generation via API route
    setTimeout(() => {
      setLoading(false)
      setGeneratedContent(`# Your Generated Content

This is where your AI-generated content will appear based on your transcript sources and selected options.

The content will be tailored to your selected format (${format}) and voice style (${voice}).

Key talking points will be transformed into original, engaging content that resonates with your audience.`)
      setGeneratedImage('/placeholder-image.jpg')
    }, 3000)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
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
            <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Select transcripts from your library or upload new ones
              </p>
              <button className="mt-4 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                Browse Transcripts
              </button>
            </div>
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
              <div className="grid grid-cols-2 gap-2">
                {imageStyles.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setImageStyle(item.id)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      imageStyle === item.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
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

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
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
              )}
            </div>
            {generatedContent ? (
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
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

          {/* Generated Image */}
          {generateImage && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Generated Image
              </h2>
              {generatedImage ? (
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Image preview placeholder
                  </div>
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
