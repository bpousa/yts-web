'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX, ChevronDown, Search, Check } from 'lucide-react'

interface Voice {
  voice_id: string
  name: string
  labels?: {
    gender?: string
    accent?: string
    age?: string
    description?: string
  }
  preview_url?: string
}

interface VoiceSelectorProps {
  speakerName: string
  selectedVoiceId: string | null
  onVoiceSelect: (voiceId: string, voiceName: string) => void
  speakerColor?: string
}

export default function VoiceSelector({
  speakerName,
  selectedVoiceId,
  onVoiceSelect,
  speakerColor = 'blue',
}: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchVoices()
  }, [])

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/voices/library')
      if (response.ok) {
        const data = await response.json()
        setVoices(data.voices || [])
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVoices = voices.filter(voice => {
    const searchLower = searchQuery.toLowerCase()
    return (
      voice.name.toLowerCase().includes(searchLower) ||
      voice.labels?.gender?.toLowerCase().includes(searchLower) ||
      voice.labels?.accent?.toLowerCase().includes(searchLower) ||
      voice.labels?.description?.toLowerCase().includes(searchLower)
    )
  })

  const selectedVoice = voices.find(v => v.voice_id === selectedVoiceId)

  const playPreview = (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation()

    if (playingPreview === voice.voice_id) {
      // Stop current preview
      audioRef.current?.pause()
      setPlayingPreview(null)
      return
    }

    if (voice.preview_url) {
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(voice.preview_url)
      audioRef.current = audio
      audio.play()
      setPlayingPreview(voice.voice_id)

      audio.onended = () => {
        setPlayingPreview(null)
      }
    }
  }

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      dot: 'bg-green-500',
    },
  }[speakerColor] || {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    dot: 'bg-gray-500',
  }

  return (
    <div className="relative">
      {/* Speaker Label */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-3 h-3 rounded-full ${colorClasses.dot}`} />
        <span className={`text-sm font-medium ${colorClasses.text}`}>
          {speakerName}
        </span>
      </div>

      {/* Voice Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 rounded-lg border ${colorClasses.border} ${colorClasses.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-gray-500" />
          <div className="text-left">
            {selectedVoice ? (
              <>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedVoice.name}
                </div>
                <div className="text-xs text-gray-500">
                  {[
                    selectedVoice.labels?.gender,
                    selectedVoice.labels?.accent,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </>
            ) : (
              <div className="text-gray-500">Select a voice...</div>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search voices..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Voice List */}
          <div className="overflow-y-auto max-h-60">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading voices...</div>
            ) : filteredVoices.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No voices found</div>
            ) : (
              filteredVoices.map(voice => (
                <button
                  key={voice.voice_id}
                  onClick={() => {
                    onVoiceSelect(voice.voice_id, voice.name)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedVoiceId === voice.voice_id
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-left">
                        {voice.name}
                      </div>
                      <div className="text-xs text-gray-500 text-left">
                        {[
                          voice.labels?.gender,
                          voice.labels?.accent,
                          voice.labels?.description,
                        ]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {voice.preview_url && (
                      <button
                        onClick={e => playPreview(voice, e)}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        {playingPreview === voice.voice_id ? (
                          <VolumeX className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
                    {selectedVoiceId === voice.voice_id && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
