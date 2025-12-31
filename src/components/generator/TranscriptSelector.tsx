'use client'

import { useState, useEffect } from 'react'
import { FileText, Check, Loader2 } from 'lucide-react'

interface Transcript {
  id: string
  videoId: string
  title: string
  createdAt: string
  projectId: string | null
}

interface TranscriptSelectorProps {
  projectId: string | null
  selectedTranscripts: string[]
  onSelectionChange: (ids: string[]) => void
  maxSelections?: number
}

export function TranscriptSelector({
  projectId,
  selectedTranscripts,
  onSelectionChange,
  maxSelections = 3,
}: TranscriptSelectorProps) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTranscripts()
  }, [projectId])

  const fetchTranscripts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (projectId) {
        params.set('projectId', projectId)
      }

      const response = await fetch(`/api/transcripts?${params}`)
      const data = await response.json()
      setTranscripts(data.transcripts || [])
    } catch (error) {
      console.error('Failed to fetch transcripts:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTranscript = (id: string) => {
    if (selectedTranscripts.includes(id)) {
      onSelectionChange(selectedTranscripts.filter(t => t !== id))
    } else if (selectedTranscripts.length < maxSelections) {
      onSelectionChange([...selectedTranscripts, id])
    }
  }

  const isMaxReached = selectedTranscripts.length >= maxSelections

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Transcripts
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {selectedTranscripts.length}/{maxSelections} selected
        </span>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : transcripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {projectId
                ? 'No transcripts in this project'
                : 'No transcripts found'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Fetch transcripts from YouTube first
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {transcripts.map(transcript => {
              const isSelected = selectedTranscripts.includes(transcript.id)
              const isDisabled = !isSelected && isMaxReached

              return (
                <button
                  key={transcript.id}
                  type="button"
                  onClick={() => !isDisabled && toggleTranscript(transcript.id)}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center gap-3 p-4 text-left transition-colors
                    ${isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : isDisabled
                        ? 'bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {/* Checkbox */}
                  <div
                    className={`
                      flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
                      transition-colors
                      ${isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : isDisabled
                          ? 'border-gray-200 dark:border-gray-700'
                          : 'border-gray-300 dark:border-gray-600'
                      }
                    `}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isSelected
                          ? 'text-blue-900 dark:text-blue-100'
                          : isDisabled
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {transcript.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(transcript.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isMaxReached && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Maximum {maxSelections} transcripts can be selected
        </p>
      )}
    </div>
  )
}
