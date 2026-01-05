'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X } from 'lucide-react'

interface ScriptInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function ScriptInput({
  value,
  onChange,
  disabled = false,
}: ScriptInputProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt'))) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        onChange(text)
      }
      reader.readAsText(file)
    }
  }, [disabled, onChange])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        onChange(text)
      }
      reader.readAsText(file)
    }
  }, [onChange])

  const handleClear = () => {
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Your Script
        </label>
        {value && (
          <button
            onClick={handleClear}
            disabled={disabled}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={`Paste your script here...

Supported formats:
• **Speaker Name:** dialogue (markdown)
• SPEAKER NAME: dialogue (screenplay)
• [Speaker]: dialogue (bracketed)
• Plain text (single narrator)

Tip: Use [brackets] for emotion cues like [laughing] or [whisper]`}
          className="w-full h-64 p-4 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
        />

        {/* Upload overlay when empty */}
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Upload className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">
                Drag & drop a .txt or .md file
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File upload button */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Upload File
        </button>
        {value && (
          <span className="text-sm text-gray-500">
            {value.split('\n').length} lines • {value.length.toLocaleString()} characters
          </span>
        )}
      </div>
    </div>
  )
}
