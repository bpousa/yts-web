'use client'

import { useState, useEffect } from 'react'
import { FolderOpen, ChevronDown, Loader2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  transcriptCount: number
}

interface ProjectSelectorProps {
  selectedProjectId: string | null
  onProjectSelect: (projectId: string | null) => void
}

export function ProjectSelector({
  selectedProjectId,
  onProjectSelect,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Project (Optional)
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-gray-400" />
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : selectedProject ? (
            <div className="text-left">
              <span className="text-gray-900 dark:text-white">{selectedProject.name}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({selectedProject.transcriptCount} transcripts)
              </span>
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">All Projects</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {/* All Projects Option */}
            <button
              type="button"
              onClick={() => {
                onProjectSelect(null)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !selectedProjectId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">All Projects</span>
              </div>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* Project List */}
            {projects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                No projects found
              </div>
            ) : (
              projects.map(project => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    onProjectSelect(project.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedProjectId === project.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {project.transcriptCount}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
