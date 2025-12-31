'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Wand2, Loader2, FileText, Clock, ExternalLink, Download, Trash2 } from 'lucide-react'
import { SearchBar } from '@/components/transcripts/SearchBar'
import { FolderTree } from '@/components/transcripts/FolderTree'
import { TranscriptModal } from '@/components/transcripts/TranscriptModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonTranscriptItem } from '@/components/ui/Skeleton'

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
  transcriptCount?: number
}

export default function TranscriptLibraryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchIn, setSearchIn] = useState<'title' | 'content' | 'both'>('both')
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transcript | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOrganizing, setIsOrganizing] = useState(false)

  // Fetch transcripts and projects
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [transcriptsRes, projectsRes] = await Promise.all([
        fetch('/api/transcripts?limit=500'),
        fetch('/api/projects'),
      ])

      if (transcriptsRes.ok) {
        const data = await transcriptsRes.json()
        setTranscripts(data.transcripts || [])
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = useCallback((query: string, searchMode: 'title' | 'content' | 'both') => {
    setSearchQuery(query)
    setSearchIn(searchMode)
  }, [])

  // Filter transcripts based on search and selected project
  const filteredTranscripts = transcripts.filter((transcript) => {
    // Filter by project
    if (selectedProjectId === 'unassigned') {
      if (transcript.projectId) return false
    } else if (selectedProjectId && transcript.projectId !== selectedProjectId) {
      return false
    }

    // Filter by search
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    if (searchIn === 'title') {
      return transcript.title.toLowerCase().includes(query)
    } else if (searchIn === 'content') {
      return transcript.content.toLowerCase().includes(query)
    } else {
      return (
        transcript.title.toLowerCase().includes(query) ||
        transcript.content.toLowerCase().includes(query)
      )
    }
  })

  // Handle transcript click - open modal
  const handleTranscriptClick = (transcript: Transcript) => {
    setSelectedTranscript(transcript)
    setModalOpen(true)
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/transcripts/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      setTranscripts((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      if (selectedTranscript?.id === deleteTarget.id) {
        setSelectedTranscript(null)
        setModalOpen(false)
      }
      toast.success('Transcript deleted')
    } catch {
      toast.error('Failed to delete transcript')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Handle move to project
  const handleMoveToProject = async (transcriptId: string, projectId: string | null) => {
    try {
      const response = await fetch(`/api/transcripts/${transcriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) throw new Error('Failed to move')

      setTranscripts((prev) =>
        prev.map((t) =>
          t.id === transcriptId ? { ...t, projectId } : t
        )
      )
      if (selectedTranscript?.id === transcriptId) {
        setSelectedTranscript({ ...selectedTranscript, projectId })
      }
      toast.success('Moved to folder')
    } catch {
      toast.error('Failed to move transcript')
    }
  }

  // Handle create project
  const handleCreateProject = async (name: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) throw new Error('Failed to create')

      const data = await response.json()
      setProjects((prev) => [...prev, data.project])
      toast.success('Folder created')
    } catch {
      toast.error('Failed to create folder')
    }
  }

  // Handle AI organize
  const handleOrganize = async () => {
    const unassigned = transcripts.filter((t) => !t.projectId)
    if (unassigned.length === 0) {
      toast.info('No unassigned transcripts to organize')
      return
    }

    setIsOrganizing(true)
    try {
      const response = await fetch('/api/transcripts/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptIds: unassigned.map((t) => t.id),
          mode: 'apply',
        }),
      })

      if (!response.ok) throw new Error('Failed to organize')

      const data = await response.json()
      toast.success(`Organized ${data.organized || 0} transcripts`)
      fetchData() // Refresh data
    } catch {
      toast.error('Failed to organize transcripts')
    } finally {
      setIsOrganizing(false)
    }
  }

  // Check if a video ID is a real YouTube ID
  const isRealYouTubeId = (videoId: string): boolean => {
    if (!videoId || videoId.length !== 11) return false
    const isHexOnly = /^[0-9a-f]+$/.test(videoId)
    return !isHexOnly
  }

  // Download transcript
  const downloadTranscript = (transcript: Transcript) => {
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

  // Get unassigned count for organize button
  const unassignedCount = transcripts.filter((t) => !t.projectId).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transcript Library
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {transcripts.length} transcript{transcripts.length !== 1 ? 's' : ''} in your library
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unassignedCount > 0 && (
            <button
              onClick={handleOrganize}
              disabled={isOrganizing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isOrganizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Organize ({unassignedCount})
            </button>
          )}
          <button
            onClick={() => router.push('/fetch')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Fetch New
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sidebar - Folder Tree */}
        <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <FolderTree
            projects={projects}
            transcripts={transcripts}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onTranscriptClick={handleTranscriptClick}
            onCreateProject={handleCreateProject}
          />
        </div>

        {/* Transcript List */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTranscriptItem key={i} />
              ))}
            </div>
          ) : filteredTranscripts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              {searchQuery ? (
                <>
                  <p className="text-lg font-medium">No matches found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </>
              ) : selectedProjectId ? (
                <>
                  <p className="text-lg font-medium">No transcripts in this folder</p>
                  <p className="text-sm mt-1">Move transcripts here or fetch new ones</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Your library is empty</p>
                  <button
                    onClick={() => router.push('/fetch')}
                    className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Fetch Your First Transcript
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTranscripts.map((transcript) => {
                  const project = projects.find((p) => p.id === transcript.projectId)

                  return (
                    <div
                      key={transcript.id}
                      onClick={() => handleTranscriptClick(transcript)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {transcript.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {transcript.content.substring(0, 200)}...
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(transcript.createdAt).toLocaleDateString()}
                            </span>
                            {project && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                                {project.name}
                              </span>
                            )}
                            {isRealYouTubeId(transcript.videoId) && (
                              <a
                                href={`https://youtube.com/watch?v=${transcript.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                              >
                                <ExternalLink className="w-3 h-3" />
                                YouTube
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadTranscript(transcript)
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(transcript)
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Modal */}
      <TranscriptModal
        transcript={selectedTranscript}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDelete={(t) => {
          setModalOpen(false)
          setDeleteTarget(t)
        }}
        onMoveToProject={handleMoveToProject}
        projects={projects}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Transcript"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}
