'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, MoreVertical, Plus, Pencil, Trash2 } from 'lucide-react'

interface Transcript {
  id: string
  videoId: string
  title: string
  content: string
  source: 'youtube' | 'whisper'
  projectId?: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
  transcriptCount?: number
}

interface FolderTreeProps {
  projects: Project[]
  transcripts: Transcript[]
  selectedProjectId: string | null
  onSelectProject: (projectId: string | null) => void
  onTranscriptClick: (transcript: Transcript) => void
  onCreateProject?: (name: string) => void
  onRenameProject?: (projectId: string, newName: string) => void
  onDeleteProject?: (projectId: string) => void
}

export function FolderTree({
  projects,
  transcripts,
  selectedProjectId,
  onSelectProject,
  onTranscriptClick,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['unassigned']))
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Group transcripts by project
  const unassignedTranscripts = transcripts.filter(t => !t.projectId)

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim() && onCreateProject) {
      onCreateProject(newFolderName.trim())
      setNewFolderName('')
      setShowNewFolder(false)
    }
  }

  const handleRenameFolder = (projectId: string) => {
    if (editingName.trim() && onRenameProject) {
      onRenameProject(projectId, editingName.trim())
      setEditingFolderId(null)
      setEditingName('')
    }
  }

  const getProjectTranscripts = (projectId: string) => {
    return transcripts.filter(t => t.projectId === projectId)
  }

  return (
    <div className="space-y-1">
      {/* All Transcripts */}
      <button
        onClick={() => onSelectProject(null)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
          selectedProjectId === null
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span className="flex-1 text-sm font-medium">All Transcripts</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {transcripts.length}
        </span>
      </button>

      {/* Project Folders */}
      {projects.map((project) => {
        const isExpanded = expandedFolders.has(project.id)
        const isSelected = selectedProjectId === project.id
        const projectTranscripts = getProjectTranscripts(project.id)
        const isEditing = editingFolderId === project.id

        return (
          <div key={project.id}>
            <div
              className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <button
                onClick={() => toggleFolder(project.id)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => onSelectProject(project.id)}
                className="flex-1 flex items-center gap-2 min-w-0"
              >
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Folder className="w-4 h-4 text-yellow-500" />
                )}

                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleRenameFolder(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameFolder(project.id)
                      if (e.key === 'Escape') {
                        setEditingFolderId(null)
                        setEditingName('')
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-700 border border-blue-500 rounded"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium truncate">
                    {project.name}
                  </span>
                )}
              </button>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                {projectTranscripts.length}
              </span>

              {/* Folder menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpenId(menuOpenId === project.id ? null : project.id)
                  }}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {menuOpenId === project.id && (
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingFolderId(project.id)
                        setEditingName(project.name)
                        setMenuOpenId(null)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                      Rename
                    </button>
                    {onDeleteProject && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteProject(project.id)
                          setMenuOpenId(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded transcripts */}
            {isExpanded && projectTranscripts.length > 0 && (
              <div className="ml-6 mt-1 space-y-0.5">
                {projectTranscripts.map((transcript) => (
                  <button
                    key={transcript.id}
                    onClick={() => onTranscriptClick(transcript)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{transcript.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Unassigned Folder */}
      <div>
        <div
          className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors ${
            selectedProjectId === 'unassigned'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <button
            onClick={() => toggleFolder('unassigned')}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            {expandedFolders.has('unassigned') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => onSelectProject('unassigned')}
            className="flex-1 flex items-center gap-2"
          >
            {expandedFolders.has('unassigned') ? (
              <FolderOpen className="w-4 h-4 text-gray-400" />
            ) : (
              <Folder className="w-4 h-4 text-gray-400" />
            )}
            <span className="flex-1 text-sm font-medium">Unassigned</span>
          </button>

          <span className="text-xs text-gray-500 dark:text-gray-400">
            {unassignedTranscripts.length}
          </span>
        </div>

        {expandedFolders.has('unassigned') && unassignedTranscripts.length > 0 && (
          <div className="ml-6 mt-1 space-y-0.5">
            {unassignedTranscripts.map((transcript) => (
              <button
                key={transcript.id}
                onClick={() => onTranscriptClick(transcript)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left"
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{transcript.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Button */}
      {showNewFolder ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <Folder className="w-4 h-4 text-yellow-500" />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              if (!newFolderName.trim()) setShowNewFolder(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') {
                setShowNewFolder(false)
                setNewFolderName('')
              }
            }}
            placeholder="Folder name..."
            autoFocus
            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      ) : (
        <button
          onClick={() => setShowNewFolder(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Folder
        </button>
      )}
    </div>
  )
}
