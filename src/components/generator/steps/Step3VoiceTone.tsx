'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Coffee, Smile, Heart, Zap, Copy, Loader2 } from 'lucide-react'
import type { WizardData } from '@/hooks/useWizard'

const VOICE_STYLES = [
  { id: 'professional', label: 'Professional', icon: Briefcase, description: 'Formal, authoritative tone' },
  { id: 'casual', label: 'Casual', icon: Coffee, description: 'Friendly, conversational tone' },
  { id: 'humorous', label: 'Humorous', icon: Smile, description: 'Witty with personality' },
  { id: 'empathetic', label: 'Empathetic', icon: Heart, description: 'Warm, understanding tone' },
  { id: 'direct', label: 'Direct & Bold', icon: Zap, description: 'Punchy, no-nonsense style' },
  { id: 'custom', label: 'Clone My Tone', icon: Copy, description: 'Use your custom tone profile' },
]

interface ToneProfile {
  id: string
  name: string
}

interface Step3Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
}

export function Step3VoiceTone({ data, updateData }: Step3Props) {
  const [toneProfiles, setToneProfiles] = useState<ToneProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)

  useEffect(() => {
    if (data.voice === 'custom') {
      fetchToneProfiles()
    }
  }, [data.voice])

  const fetchToneProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const response = await fetch('/api/tones')
      console.log('Tone profiles response status:', response.status)
      const result = await response.json()
      console.log('Tone profiles result:', result)
      if (!response.ok) {
        console.error('Tone profiles API error:', result.error)
      }
      setToneProfiles(result.toneProfiles || [])
    } catch (error) {
      console.error('Failed to fetch tone profiles:', error)
    } finally {
      setLoadingProfiles(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Select Voice Style
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose the tone and writing style for your generated content.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {VOICE_STYLES.map((style) => {
          const Icon = style.icon
          const isSelected = data.voice === style.id

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => {
                updateData({
                  voice: style.id,
                  // Clear tone profile if not custom
                  toneProfileId: style.id !== 'custom' ? null : data.toneProfileId,
                })
              }}
              className={`
                flex items-start gap-4 p-4 rounded-xl border-2 text-left
                transition-all duration-200
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
            >
              <div
                className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                  ${isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
              </div>

              <div>
                <span
                  className={`
                    block text-sm font-medium
                    ${isSelected
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {style.label}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {style.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tone Profile Selector (when Clone My Tone is selected) */}
      {data.voice === 'custom' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Tone Profile
          </label>

          {loadingProfiles ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading profiles...
            </div>
          ) : toneProfiles.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tone profiles found. Create one in Settings first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {toneProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => updateData({ toneProfileId: profile.id })}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border text-left
                    transition-colors
                    ${data.toneProfileId === profile.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Copy className={`w-4 h-4 ${
                    data.toneProfileId === profile.id
                      ? 'text-blue-500'
                      : 'text-gray-400'
                  }`} />
                  <span className={`text-sm ${
                    data.toneProfileId === profile.id
                      ? 'text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {profile.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {data.voice === 'custom' && !data.toneProfileId && toneProfiles.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Please select a tone profile to continue
            </p>
          )}
        </div>
      )}
    </div>
  )
}
