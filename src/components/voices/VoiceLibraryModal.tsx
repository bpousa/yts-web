'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, Play, Pause, Plus, Check, Loader2, User, Filter } from 'lucide-react'

interface LibraryVoice {
  voice_id: string
  name: string
  preview_url: string | null
  category: string
  gender: string | null
  accent: string | null
  age: string | null
  description: string | null
  use_case: string | null
}

interface VoiceLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveVoice: (voice: LibraryVoice) => Promise<void>
  savedVoiceIds?: string[]
}

const genderOptions = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const accentOptions = [
  { value: '', label: 'All Accents' },
  { value: 'american', label: 'American' },
  { value: 'british', label: 'British' },
  { value: 'australian', label: 'Australian' },
  { value: 'indian', label: 'Indian' },
]

export function VoiceLibraryModal({
  isOpen,
  onClose,
  onSaveVoice,
  savedVoiceIds = [],
}: VoiceLibraryModalProps) {
  const [voices, setVoices] = useState<LibraryVoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [accent, setAccent] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Audio preview
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Saving state
  const [savingVoiceId, setSavingVoiceId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchVoices()
    }
  }, [isOpen, search, gender, accent])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
      stopAudio()
    }
  }, [isOpen, onClose])

  const fetchVoices = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (gender) params.set('gender', gender)
      if (accent) params.set('accent', accent)

      const response = await fetch(`/api/voices/library?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch voices')
      }

      setVoices(data.voices || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voices')
    } finally {
      setLoading(false)
    }
  }

  const playPreview = (voice: LibraryVoice) => {
    if (!voice.preview_url) return

    if (playingVoiceId === voice.voice_id) {
      stopAudio()
      return
    }

    stopAudio()

    const audio = new Audio(voice.preview_url)
    audio.onended = () => setPlayingVoiceId(null)
    audio.onerror = () => setPlayingVoiceId(null)
    audio.play()
    audioRef.current = audio
    setPlayingVoiceId(voice.voice_id)
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoiceId(null)
  }

  const handleSaveVoice = async (voice: LibraryVoice) => {
    setSavingVoiceId(voice.voice_id)
    try {
      await onSaveVoice(voice)
    } finally {
      setSavingVoiceId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            Voice Library
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search voices..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters || gender || accent
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex gap-3 pt-2">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {accentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {(gender || accent) && (
                <button
                  onClick={() => {
                    setGender('')
                    setAccent('')
                  }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Voice Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchVoices}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : voices.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No voices found</p>
              {(search || gender || accent) && (
                <button
                  onClick={() => {
                    setSearch('')
                    setGender('')
                    setAccent('')
                  }}
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voices.map((voice) => {
                const isSaved = savedVoiceIds.includes(voice.voice_id)
                const isSaving = savingVoiceId === voice.voice_id
                const isPlaying = playingVoiceId === voice.voice_id

                return (
                  <div
                    key={voice.voice_id}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {voice.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {voice.gender && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                              {voice.gender}
                            </span>
                          )}
                          {voice.accent && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                              {voice.accent}
                            </span>
                          )}
                          {voice.age && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                              {voice.age}
                            </span>
                          )}
                        </div>
                        {voice.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                            {voice.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Preview button */}
                        <button
                          onClick={() => playPreview(voice)}
                          disabled={!voice.preview_url}
                          className={`p-2 rounded-lg transition-colors ${
                            voice.preview_url
                              ? isPlaying
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
                              : 'opacity-50 cursor-not-allowed text-gray-400'
                          }`}
                          title={voice.preview_url ? (isPlaying ? 'Stop' : 'Preview') : 'No preview available'}
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </button>

                        {/* Save button */}
                        <button
                          onClick={() => handleSaveVoice(voice)}
                          disabled={isSaved || isSaving}
                          className={`p-2 rounded-lg transition-colors ${
                            isSaved
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-default'
                              : isSaving
                              ? 'bg-gray-100 dark:bg-gray-600 text-gray-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                          }`}
                          title={isSaved ? 'Already saved' : 'Save to My Voices'}
                        >
                          {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : isSaved ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Plus className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {voices.length} voice{voices.length !== 1 ? 's' : ''} found
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
