'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function TranscriptsPage() {
  const [urls, setUrls] = useState('')
  const [projectName, setProjectName] = useState('')
  const [includeTimestamps, setIncludeTimestamps] = useState(false)
  const [useAIFallback, setUseAIFallback] = useState(true)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleFetch = async () => {
    setLoading(true)
    // TODO: Implement transcript fetching via API route
    // This will call /api/transcripts with the URLs
    setTimeout(() => {
      setLoading(false)
      setResults([
        { videoId: 'demo', title: 'Demo Video', status: 'success', content: 'Transcript content here...' }
      ])
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Transcript Fetcher
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fetch transcripts from YouTube videos. Paste URLs below (one per line).
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            YouTube URLs
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://youtube.com/watch?v=...&#10;https://youtu.be/...&#10;Paste multiple URLs, one per line"
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project Name (optional)
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include timestamps
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useAIFallback}
                onChange={(e) => setUseAIFallback(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Use AI transcription if official not available
              </span>
            </label>
          </div>
        </div>

        {/* Fetch Button */}
        <button
          onClick={handleFetch}
          disabled={loading || !urls.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Fetching transcripts...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Get Transcripts
            </>
          )}
        </button>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Results
              </h2>
              <button className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Download All (ZIP)
              </button>
            </div>

            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {result.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {result.videoId}
                        </p>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
