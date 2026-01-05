'use client'

import { useState } from 'react'
import { Edit2, Check, X, Clock } from 'lucide-react'

interface Segment {
  speaker: string
  text: string
  originalText: string
  hasChanges: boolean
  lineNumber: number
}

interface ScriptPreviewProps {
  segments: Segment[]
  speakers: string[]
  estimatedDuration: string
  onSegmentEdit: (index: number, newText: string) => void
}

const SPEAKER_COLORS = [
  {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    name: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
    name: 'text-green-700 dark:text-green-300',
  },
]

export default function ScriptPreview({
  segments,
  speakers,
  estimatedDuration,
  onSegmentEdit,
}: ScriptPreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const getSpeakerColor = (speaker: string) => {
    const index = speakers.indexOf(speaker)
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length]
  }

  const startEditing = (index: number, text: string) => {
    setEditingIndex(index)
    setEditText(text)
  }

  const saveEdit = () => {
    if (editingIndex !== null) {
      onSegmentEdit(editingIndex, editText)
      setEditingIndex(null)
      setEditText('')
    }
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditText('')
  }

  // Extract bracket tags for visual display
  const renderTextWithTags = (text: string) => {
    const parts = text.split(/(\[[^\]]+\])/g)
    return parts.map((part, i) => {
      if (part.match(/^\[[^\]]+\]$/)) {
        // This is a bracket tag
        return (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 mx-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full"
          >
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Script Preview
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>~{estimatedDuration}</span>
        </div>
      </div>

      {/* Segments */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
        {segments.map((segment, index) => {
          const colors = getSpeakerColor(segment.speaker)
          const isEditing = editingIndex === index

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}
            >
              {/* Speaker Name */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className={`font-medium ${colors.name}`}>
                    {segment.speaker}
                  </span>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => startEditing(index, segment.text)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit segment"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Content */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                    rows={4}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {renderTextWithTags(segment.text)}
                </div>
              )}

              {/* Show changes indicator */}
              {segment.hasChanges && !isEditing && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <details className="text-xs">
                    <summary className="text-amber-600 dark:text-amber-400 cursor-pointer">
                      View original
                    </summary>
                    <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded text-gray-500 line-through">
                      {segment.originalText}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {segments.length} segments • {segments.filter(s => s.hasChanges).length}{' '}
        modified
      </div>
    </div>
  )
}
