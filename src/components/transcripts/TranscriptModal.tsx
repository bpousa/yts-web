'use client'

import { useEffect, useCallback } from 'react'
import { X, Copy, Download, Trash2, ExternalLink, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

interface Transcript {
  id: string
  videoId: string
  title: string
  content: string
  source: 'youtube' | 'whisper'
  projectId?: string | null
  projectName?: string
  createdAt: string
}

interface Project {
  id: string
  name: string
}

interface TranscriptModalProps {
  transcript: Transcript | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (transcript: Transcript) => void
  onMoveToProject?: (transcriptId: string, projectId: string | null) => void
  projects?: Project[]
}

export function TranscriptModal({
  transcript,
  isOpen,
  onClose,
  onDelete,
  onMoveToProject,
  projects = [],
}: TranscriptModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !transcript) return null

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript.content)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const downloadTranscript = () => {
    const blob = new Blob([transcript.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${transcript.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Downloaded')
  }

  // Check if a video ID looks like a real YouTube video ID
  const isRealYouTubeId = (videoId: string): boolean => {
    if (!videoId || videoId.length !== 11) return false
    const isHexOnly = /^[0-9a-f]+$/.test(videoId)
    return !isHexOnly
  }

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value || null
    if (onMoveToProject) {
      onMoveToProject(transcript.id, projectId)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {transcript.title}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              {isRealYouTubeId(transcript.videoId) && (
                <a
                  href={`https://youtube.com/watch?v=${transcript.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on YouTube
                </a>
              )}
              <span>
                Source: {transcript.source === 'youtube' ? 'YouTube Captions' : 'AI Transcription'}
              </span>
              <span>
                {new Date(transcript.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
            {transcript.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <select
              value={transcript.projectId || ''}
              onChange={handleProjectChange}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(transcript)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
