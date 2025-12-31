'use client'

import { useState, useRef } from 'react'
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  ChevronDown,
  Mic,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

interface SeoData {
  title: string
  description: string
  keywords: string[]
  readabilityScore: number
  readabilityLevel: string
}

interface ContentResultsProps {
  content: string | null
  contentId: string | null
  isGenerating: boolean
  onPodcastClick: () => void
}

export function ContentResults({
  content,
  contentId,
  isGenerating,
  onPodcastClick,
}: ContentResultsProps) {
  const [copied, setCopied] = useState(false)
  const [seoData, setSeoData] = useState<SeoData | null>(null)
  const [analyzingSeo, setAnalyzingSeo] = useState(false)
  const [showSeo, setShowSeo] = useState(false)
  const contentRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      toast.success('Content copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy content')
    }
  }

  const handleAnalyzeSeo = async () => {
    if (!content) return

    setAnalyzingSeo(true)
    try {
      const response = await fetch('/api/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      const data = await response.json()

      if (response.ok) {
        setSeoData(data)
        setShowSeo(true)
        toast.success('SEO analysis complete')
      } else {
        toast.error(data.error || 'SEO analysis failed')
      }
    } catch {
      toast.error('Failed to analyze SEO')
    } finally {
      setAnalyzingSeo(false)
    }
  }

  const handleDownload = () => {
    if (!content) return

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-content.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Content downloaded')
  }

  return (
    <div className="space-y-6">
      {/* Generated Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Generated Content
          </h2>
          {content && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAnalyzeSeo}
                disabled={analyzingSeo}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50"
              >
                {analyzingSeo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                SEO
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
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

        {isGenerating ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-gray-500 dark:text-gray-400">Generating content...</p>
            </div>
          </div>
        ) : content ? (
          <div className="prose dark:prose-invert max-w-none">
            <pre
              ref={contentRef}
              className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans bg-gray-50 dark:bg-gray-900 p-4 rounded-lg max-h-96 overflow-y-auto"
            >
              {content}
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
      {seoData && showSeo && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              SEO Analysis
            </h2>
            <button
              onClick={() => setShowSeo(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
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

      {/* Podcast CTA */}
      {contentId && (
        <button
          onClick={onPodcastClick}
          className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white hover:from-purple-600 hover:to-pink-600 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <Mic className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold">Create Podcast</h3>
              <p className="text-sm text-white/80">
                Convert this content into a two-host podcast script
              </p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 -rotate-90 group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  )
}
