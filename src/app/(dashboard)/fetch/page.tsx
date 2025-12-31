'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Download, Loader2, AlertCircle, CheckCircle, ArrowRight, FolderOpen } from 'lucide-react'

interface TranscriptResult {
  id: string
  videoId: string
  title: string
  content: string
  source: 'youtube' | 'whisper'
  status: 'success' | 'failed'
  error?: string
  createdAt: string
}

interface BatchResult {
  successful: TranscriptResult[]
  failed: Array<{ url: string; error: string }>
}

export default function FetchPage() {
  const router = useRouter()
  const [urls, setUrls] = useState('')
  const [projectName, setProjectName] = useState('')
  const [includeTimestamps, setIncludeTimestamps] = useState(false)
  const [useAIFallback, setUseAIFallback] = useState(true)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TranscriptResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u.length > 0)

    if (urlList.length === 0) {
      toast.error('Please enter at least one URL')
      return
    }

    setLoading(true)
    setError(null)
    setResults([])

    try {
      if (urlList.length === 1) {
        // Single URL fetch
        const response = await fetch('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: urlList[0],
            includeTimestamps,
            enableFallback: useAIFallback,
            projectName: projectName || undefined,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch transcript')
        }

        setResults([{
          id: data.id,
          videoId: data.videoId,
          title: data.title,
          content: data.transcript,
          source: data.source,
          status: 'success',
          createdAt: new Date().toISOString(),
        }])

        toast.success('Transcript fetched successfully')
      } else {
        // Batch fetch
        const response = await fetch('/api/transcripts/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: urlList,
            includeTimestamps,
            enableFallback: useAIFallback,
            projectName: projectName || undefined,
          }),
        })

        const data: BatchResult = await response.json()

        if (!response.ok) {
          throw new Error('Batch fetch failed')
        }

        const successResults: TranscriptResult[] = data.successful.map(t => ({
          id: t.id,
          videoId: t.videoId,
          title: t.title,
          content: t.content,
          source: t.source,
          status: 'success' as const,
          createdAt: new Date().toISOString(),
        }))

        const failedResults: TranscriptResult[] = data.failed.map(f => ({
          id: '',
          videoId: '',
          title: f.url,
          content: '',
          source: 'youtube' as const,
          status: 'failed' as const,
          error: f.error,
          createdAt: new Date().toISOString(),
        }))

        setResults([...successResults, ...failedResults])

        if (successResults.length > 0) {
          toast.success(`${successResults.length} transcript(s) fetched successfully`)
        }
        if (failedResults.length > 0) {
          toast.error(`${failedResults.length} transcript(s) failed`)
        }
      }

      setUrls('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const downloadTranscript = (transcript: TranscriptResult) => {
    const blob = new Blob([transcript.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${transcript.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Transcript downloaded')
  }

  const downloadAllAsZip = async () => {
    const successResults = results.filter(r => r.status === 'success')
    if (successResults.length === 0) {
      toast.error('No transcripts to download')
      return
    }

    const content = successResults
      .map(r => `=== ${r.title} ===\n\n${r.content}\n\n`)
      .join('\n---\n\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcripts_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`${successResults.length} transcript(s) downloaded`)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const failedCount = results.filter(r => r.status === 'failed').length

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Fetch Transcripts
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
              Project/Folder Name (optional)
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Auto-organized if empty"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave empty to let AI organize into existing folders
            </p>
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
                Use AI transcription if no captions
              </span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

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
            {/* Summary Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Fetch Complete
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {successCount} successful, {failedCount} failed
                </p>
              </div>
              <div className="flex items-center gap-2">
                {successCount > 0 && (
                  <button
                    onClick={downloadAllAsZip}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
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
                        {result.status === 'success' ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Source: {result.source === 'youtube' ? 'YouTube Captions' : 'AI Transcription'}
                          </p>
                        ) : (
                          <p className="text-sm text-red-500 dark:text-red-400">
                            {result.error}
                          </p>
                        )}
                      </div>
                    </div>
                    {result.status === 'success' && (
                      <button
                        onClick={() => downloadTranscript(result)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            {successCount > 0 && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => router.push('/transcripts')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                >
                  <FolderOpen className="w-5 h-5" />
                  View in Library
                </button>
                <button
                  onClick={() => router.push('/generator')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Generate Content
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-900">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
          <li>• You can paste multiple YouTube URLs, one per line</li>
          <li>• Videos without captions will be transcribed using AI (if enabled)</li>
          <li>• Transcripts are saved to your library automatically</li>
          <li>• Use the Chrome extension to send videos directly from YouTube</li>
        </ul>
      </div>
    </div>
  )
}
