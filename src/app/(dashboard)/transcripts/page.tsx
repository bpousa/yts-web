'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Loader2, AlertCircle, CheckCircle, Trash2, ExternalLink, Clock } from 'lucide-react'

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

export default function TranscriptsPage() {
  const [urls, setUrls] = useState('')
  const [projectName, setProjectName] = useState('')
  const [includeTimestamps, setIncludeTimestamps] = useState(false)
  const [useAIFallback, setUseAIFallback] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetchingList, setFetchingList] = useState(true)
  const [results, setResults] = useState<TranscriptResult[]>([])
  const [savedTranscripts, setSavedTranscripts] = useState<TranscriptResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptResult | null>(null)

  // Fetch existing transcripts on mount
  useEffect(() => {
    fetchTranscripts()
  }, [])

  const fetchTranscripts = async () => {
    try {
      setFetchingList(true)
      const response = await fetch('/api/transcripts')
      if (!response.ok) {
        throw new Error('Failed to fetch transcripts')
      }
      const data = await response.json()
      setSavedTranscripts(data.transcripts || [])
    } catch (err) {
      console.error('Error fetching transcripts:', err)
    } finally {
      setFetchingList(false)
    }
  }

  const handleFetch = async () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u.length > 0)

    if (urlList.length === 0) {
      setError('Please enter at least one URL')
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
      }

      // Refresh the saved transcripts list
      await fetchTranscripts()
      setUrls('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete transcript')
      }

      setSavedTranscripts(prev => prev.filter(t => t.id !== id))
      if (selectedTranscript?.id === id) {
        setSelectedTranscript(null)
      }
    } catch (err) {
      console.error('Error deleting transcript:', err)
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
  }

  const downloadAllAsZip = async () => {
    // For simplicity, download as concatenated text file
    // In production, you might use JSZip library
    const content = results
      .filter(r => r.status === 'success')
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
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Transcript Fetcher
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Fetch transcripts from YouTube videos. Paste URLs below (one per line).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fetch Form */}
        <div className="lg:col-span-2">
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
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Results ({results.filter(r => r.status === 'success').length} successful)
                  </h2>
                  <button
                    onClick={downloadAllAsZip}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download All
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
                            {result.status === 'success' ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {result.videoId} | Source: {result.source}
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
              </div>
            )}
          </div>
        </div>

        {/* Saved Transcripts Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Saved Transcripts
            </h2>

            {fetchingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : savedTranscripts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No transcripts saved yet
              </p>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {savedTranscripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTranscript?.id === transcript.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                    onClick={() => setSelectedTranscript(transcript)}
                  >
                    <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
                      {transcript.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(transcript.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <a
                        href={`https://youtube.com/watch?v=${transcript.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View
                      </a>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadTranscript(transcript)
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(transcript.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Transcript Preview */}
          {selectedTranscript && (
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {selectedTranscript.title}
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                  {selectedTranscript.content.substring(0, 1000)}
                  {selectedTranscript.content.length > 1000 && '...'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
