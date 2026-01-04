'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Loader2, Trash2, Edit2, Save, X, ExternalLink, Link as LinkIcon, Play, Pause, Mic, Library, Wand2, Star, StarOff, Plus, Volume2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SkeletonToneProfile } from '@/components/ui/Skeleton'
import { VoiceLibraryModal, VoiceDesignerModal } from '@/components/voices'

interface ToneProfile {
  id: string
  name: string
  styleDna: string
  sampleText?: string
  sourceUrl?: string
  createdAt: string
}

interface SavedVoice {
  id: string
  voice_id: string
  name: string
  description: string | null
  gender: string | null
  accent: string | null
  age: string | null
  preview_url: string | null
  source: 'library' | 'designed' | 'cloned'
  design_prompt: string | null
  is_default_host1: boolean
  is_default_host2: boolean
  created_at: string
}

interface PronunciationRule {
  id: string
  find_text: string
  replace_with: string
  is_regex: boolean
  is_enabled: boolean
  created_at: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'tones' | 'voices' | 'pronunciation' | 'preferences'>('tones')

  // Tone Lab State
  const [sampleText, setSampleText] = useState('')
  const [sampleUrl, setSampleUrl] = useState('')
  const [analyzingTone, setAnalyzingTone] = useState(false)
  const [analyzedDna, setAnalyzedDna] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profiles, setProfiles] = useState<ToneProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDna, setEditDna] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [deletingProfile, setDeletingProfile] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ToneProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Preferences State
  const [defaultAiFallback, setDefaultAiFallback] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  // Voices State
  const [voices, setVoices] = useState<SavedVoice[]>([])
  const [loadingVoices, setLoadingVoices] = useState(true)
  const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null)
  const [voiceDeleteTarget, setVoiceDeleteTarget] = useState<SavedVoice | null>(null)
  const [settingDefaultVoice, setSettingDefaultVoice] = useState<string | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [showVoiceLibrary, setShowVoiceLibrary] = useState(false)
  const [showVoiceDesigner, setShowVoiceDesigner] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Pronunciation State
  const [pronunciationRules, setPronunciationRules] = useState<PronunciationRule[]>([])
  const [loadingPronunciation, setLoadingPronunciation] = useState(true)
  const [newFindText, setNewFindText] = useState('')
  const [newReplaceWith, setNewReplaceWith] = useState('')
  const [savingRule, setSavingRule] = useState(false)
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null)

  // Fetch profiles, voices, and pronunciation rules on mount
  useEffect(() => {
    fetchProfiles()
    fetchVoices()
    fetchPronunciationRules()
  }, [])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/tones')
      const data = await response.json()
      setProfiles(data.toneProfiles || [])
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
    } finally {
      setLoadingProfiles(false)
    }
  }

  const fetchVoices = async () => {
    try {
      const response = await fetch('/api/voices')
      const data = await response.json()
      setVoices(data.voices || [])
    } catch (err) {
      console.error('Failed to fetch voices:', err)
    } finally {
      setLoadingVoices(false)
    }
  }

  const fetchPronunciationRules = async () => {
    try {
      const response = await fetch('/api/pronunciation-rules')
      const data = await response.json()
      setPronunciationRules(data.rules || [])
    } catch (err) {
      console.error('Failed to fetch pronunciation rules:', err)
    } finally {
      setLoadingPronunciation(false)
    }
  }

  const handleAddPronunciationRule = async () => {
    if (!newFindText.trim() || !newReplaceWith.trim()) {
      toast.error('Both fields are required')
      return
    }

    setSavingRule(true)
    try {
      const response = await fetch('/api/pronunciation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          find_text: newFindText.trim(),
          replace_with: newReplaceWith.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add rule')
      }

      setPronunciationRules((prev) => [data.rule, ...prev])
      setNewFindText('')
      setNewReplaceWith('')
      toast.success('Pronunciation rule added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add rule')
    } finally {
      setSavingRule(false)
    }
  }

  const handleDeletePronunciationRule = async (id: string) => {
    setDeletingRuleId(id)
    try {
      const response = await fetch(`/api/pronunciation-rules/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete rule')
      }

      setPronunciationRules((prev) => prev.filter((r) => r.id !== id))
      toast.success('Rule deleted')
    } catch (err) {
      toast.error('Failed to delete rule')
    } finally {
      setDeletingRuleId(null)
    }
  }

  const playVoicePreview = (voice: SavedVoice) => {
    if (!voice.preview_url) return

    if (playingVoiceId === voice.id) {
      stopAudio()
      return
    }

    stopAudio()

    const audio = new Audio(voice.preview_url)
    audio.onended = () => setPlayingVoiceId(null)
    audio.onerror = () => setPlayingVoiceId(null)
    audio.play()
    audioRef.current = audio
    setPlayingVoiceId(voice.id)
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoiceId(null)
  }

  const handleSetDefaultVoice = async (voiceId: string, host: 'host1' | 'host2') => {
    setSettingDefaultVoice(`${voiceId}-${host}`)

    try {
      const response = await fetch(`/api/voices/${voiceId}/default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set default voice')
      }

      // Refresh voices to get updated defaults
      await fetchVoices()
      toast.success(`Voice set as default for ${host === 'host1' ? 'Host 1' : 'Host 2'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default voice')
    } finally {
      setSettingDefaultVoice(null)
    }
  }

  const handleDeleteVoiceConfirm = async () => {
    if (!voiceDeleteTarget) return

    setDeletingVoiceId(voiceDeleteTarget.id)

    try {
      const response = await fetch(`/api/voices/${voiceDeleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete voice')
      }

      setVoices((prev) => prev.filter((v) => v.id !== voiceDeleteTarget.id))
      toast.success('Voice deleted')
      setVoiceDeleteTarget(null)
    } catch (err) {
      toast.error('Failed to delete voice')
    } finally {
      setDeletingVoiceId(null)
    }
  }

  const handleSaveVoiceFromLibrary = async (voice: {
    voice_id: string
    name: string
    preview_url: string | null
    gender: string | null
    accent: string | null
    age: string | null
    description: string | null
  }) => {
    try {
      const response = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: voice.voice_id,
          name: voice.name,
          description: voice.description,
          gender: voice.gender,
          accent: voice.accent,
          age: voice.age,
          preview_url: voice.preview_url,
          source: 'library',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save voice')
      }

      setVoices((prev) => [data.voice, ...prev])
      toast.success(`"${voice.name}" saved to your voices`)
    } catch (err) {
      if (err instanceof Error && err.message.includes('already saved')) {
        toast.info('Voice already saved to your profile')
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to save voice')
      }
    }
  }

  const handleAnalyzeTone = async () => {
    if (!sampleText.trim() && !sampleUrl.trim()) {
      toast.error('Please provide sample text or a URL to analyze')
      return
    }

    setAnalyzingTone(true)
    setError(null)

    try {
      const response = await fetch('/api/tones/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleText: sampleText.trim() || undefined,
          sourceUrl: sampleUrl.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Tone analysis failed')
      }

      setAnalyzedDna(data.styleDna)
      toast.success('Tone analysis complete')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      setError(message)
      toast.error(message)
    } finally {
      setAnalyzingTone(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('Please enter a profile name')
      return
    }
    if (!analyzedDna.trim()) {
      toast.error('No style DNA to save')
      return
    }

    setSavingProfile(true)
    setError(null)

    try {
      const response = await fetch('/api/tones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName.trim(),
          styleDna: analyzedDna,
          sampleText: sampleText.trim() || undefined,
          sourceUrl: sampleUrl.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      setProfiles((prev) => [data.profile, ...prev])
      setProfileName('')
      setAnalyzedDna('')
      setSampleText('')
      setSampleUrl('')
      toast.success(`Profile "${data.profile.name}" created`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setError(message)
      toast.error(message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleStartEdit = (profile: ToneProfile) => {
    setEditingProfile(profile.id)
    setEditName(profile.name)
    setEditDna(profile.styleDna)
  }

  const handleCancelEdit = () => {
    setEditingProfile(null)
    setEditName('')
    setEditDna('')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim() || !editDna.trim()) {
      toast.error('Name and style DNA are required')
      return
    }

    setSavingProfile(true)

    try {
      const response = await fetch(`/api/tones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          styleDna: editDna.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? data.profile : p))
      )
      setEditingProfile(null)
      toast.success('Profile updated')
    } catch (err) {
      toast.error('Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeletingProfile(deleteTarget.id)

    try {
      const response = await fetch(`/api/tones/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete profile')
      }

      setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success('Profile deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error('Failed to delete profile')
    } finally {
      setDeletingProfile(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your tone profiles and application preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('tones')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'tones'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Tone Lab
        </button>
        <button
          onClick={() => setActiveTab('voices')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'voices'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Voices
        </button>
        <button
          onClick={() => setActiveTab('pronunciation')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'pronunciation'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Pronunciation
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'preferences'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Preferences
        </button>
      </div>

      {activeTab === 'tones' && (
        <div className="space-y-6">
          {/* Create New Tone */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Tone Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sample Text
                </label>
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  placeholder="Paste a sample of writing that represents the tone you want to clone (minimum 200 characters)..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {sampleText.length} characters
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL to Analyze
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={sampleUrl}
                      onChange={(e) => setSampleUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
                    />
                  </div>
                  {sampleUrl && (
                    <a
                      href={sampleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <ExternalLink className="w-5 h-5 text-gray-500" />
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  We'll extract text from this URL to analyze the writing style
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleAnalyzeTone}
                disabled={analyzingTone || (!sampleText.trim() && !sampleUrl.trim())}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                {analyzingTone ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Tone'
                )}
              </button>

              {analyzedDna && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Style DNA (edit if needed)
                    </label>
                    <textarea
                      value={analyzedDna}
                      onChange={(e) => setAnalyzedDna(e.target.value)}
                      rows={10}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Profile name..."
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
                    />
                    <button
                      onClick={handleSaveProfile}
                      disabled={!profileName.trim() || savingProfile}
                      className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    >
                      {savingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Existing Profiles */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Tone Profiles
            </h2>

            {loadingProfiles ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonToneProfile key={i} />
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No tone profiles yet. Create one above!
              </p>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    {editingProfile === profile.id ? (
                      // Editing mode
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <textarea
                          value={editDna}
                          onChange={(e) => setEditDna(e.target.value)}
                          rows={8}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(profile.id)}
                            disabled={savingProfile}
                            className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            {savingProfile ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {profile.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Created {new Date(profile.createdAt).toLocaleDateString()}
                            </p>
                            {profile.sourceUrl && (
                              <a
                                href={profile.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Source
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEdit(profile)}
                              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(profile)}
                              disabled={deletingProfile === profile.id}
                              className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                              title="Delete profile"
                            >
                              {deletingProfile === profile.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-600/50 rounded text-sm text-gray-700 dark:text-gray-300 font-mono max-h-32 overflow-y-auto">
                          {profile.styleDna.substring(0, 300)}
                          {profile.styleDna.length > 300 && '...'}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'voices' && (
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowVoiceLibrary(true)}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Library className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">Voice Library</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Browse pre-made voices</p>
              </div>
            </button>
            <button
              onClick={() => setShowVoiceDesigner(true)}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">Design Voice</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create a custom voice</p>
              </div>
            </button>
          </div>

          {/* Saved Voices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              My Voices
            </h2>

            {loadingVoices ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : voices.length === 0 ? (
              <div className="text-center py-12">
                <Mic className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No voices saved yet. Browse the voice library or design your own!
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowVoiceLibrary(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Library
                  </button>
                  <button
                    onClick={() => setShowVoiceDesigner(true)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Design Voice
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {voices.map((voice) => (
                  <div
                    key={voice.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-start gap-4">
                      {/* Play button */}
                      <button
                        onClick={() => playVoicePreview(voice)}
                        disabled={!voice.preview_url}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          voice.preview_url
                            ? playingVoiceId === voice.id
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {playingVoiceId === voice.id ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>

                      {/* Voice info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {voice.name}
                          </h3>
                          {voice.source === 'designed' && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                              Custom
                            </span>
                          )}
                        </div>
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
                          {voice.is_default_host1 && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex items-center gap-1">
                              <Star className="w-3 h-3" /> Host 1
                            </span>
                          )}
                          {voice.is_default_host2 && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex items-center gap-1">
                              <Star className="w-3 h-3" /> Host 2
                            </span>
                          )}
                        </div>
                        {voice.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {voice.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Set as Host 1 */}
                        <button
                          onClick={() => handleSetDefaultVoice(voice.id, 'host1')}
                          disabled={voice.is_default_host1 || settingDefaultVoice === `${voice.id}-host1`}
                          className={`p-2 rounded-lg transition-colors ${
                            voice.is_default_host1
                              ? 'text-green-600 dark:text-green-400 cursor-default'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          title={voice.is_default_host1 ? 'Default for Host 1' : 'Set as Host 1 default'}
                        >
                          {settingDefaultVoice === `${voice.id}-host1` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : voice.is_default_host1 ? (
                            <Star className="w-4 h-4 fill-current" />
                          ) : (
                            <span className="text-xs font-medium">H1</span>
                          )}
                        </button>

                        {/* Set as Host 2 */}
                        <button
                          onClick={() => handleSetDefaultVoice(voice.id, 'host2')}
                          disabled={voice.is_default_host2 || settingDefaultVoice === `${voice.id}-host2`}
                          className={`p-2 rounded-lg transition-colors ${
                            voice.is_default_host2
                              ? 'text-green-600 dark:text-green-400 cursor-default'
                              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          title={voice.is_default_host2 ? 'Default for Host 2' : 'Set as Host 2 default'}
                        >
                          {settingDefaultVoice === `${voice.id}-host2` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : voice.is_default_host2 ? (
                            <Star className="w-4 h-4 fill-current" />
                          ) : (
                            <span className="text-xs font-medium">H2</span>
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setVoiceDeleteTarget(voice)}
                          disabled={deletingVoiceId === voice.id}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Delete voice"
                        >
                          {deletingVoiceId === voice.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Set default voices for Host 1 and Host 2 to automatically use them when generating podcast audio.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'pronunciation' && (
        <div className="space-y-6">
          {/* Add New Rule */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Pronunciation Rule
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Define how specific words or phrases should be pronounced in your podcasts.
            </p>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Find Text
                </label>
                <input
                  type="text"
                  value={newFindText}
                  onChange={(e) => setNewFindText(e.target.value)}
                  placeholder="e.g., API, CEO, $500k"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pronounce As
                </label>
                <input
                  type="text"
                  value={newReplaceWith}
                  onChange={(e) => setNewReplaceWith(e.target.value)}
                  placeholder="e.g., A P I, Chief Executive Officer, five hundred thousand dollars"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
                />
              </div>
              <button
                onClick={handleAddPronunciationRule}
                disabled={savingRule || !newFindText.trim() || !newReplaceWith.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                {savingRule ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Rule
              </button>
            </div>
          </div>

          {/* Existing Rules */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Pronunciation Rules
            </h2>

            {loadingPronunciation ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pronunciationRules.length === 0 ? (
              <div className="text-center py-12">
                <Volume2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No pronunciation rules yet. Add one above to customize how words are spoken.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pronunciationRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded text-gray-800 dark:text-gray-200">
                        {rule.find_text}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {rule.replace_with}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePronunciationRule(rule.id)}
                      disabled={deletingRuleId === rule.id}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {deletingRuleId === rule.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Built-in rules:</strong> Currency ($200k → two hundred thousand dollars), percentages, and number abbreviations are automatically converted. Add custom rules for brand names, acronyms, or technical terms.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Application Preferences
          </h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Default AI Transcription Fallback
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Automatically use AI transcription when official transcripts are unavailable
                </p>
              </div>
              <input
                type="checkbox"
                checked={defaultAiFallback}
                onChange={(e) => setDefaultAiFallback(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Dark Mode
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Use dark theme throughout the application
                </p>
              </div>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Note: Preferences are stored locally and will be synced to your account in a future update.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Tone Profile"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={!!deletingProfile}
      />

      {/* Voice Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!voiceDeleteTarget}
        onClose={() => setVoiceDeleteTarget(null)}
        onConfirm={handleDeleteVoiceConfirm}
        title="Delete Voice"
        message={`Are you sure you want to delete "${voiceDeleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={!!deletingVoiceId}
      />

      {/* Voice Library Modal */}
      <VoiceLibraryModal
        isOpen={showVoiceLibrary}
        onClose={() => setShowVoiceLibrary(false)}
        onSaveVoice={handleSaveVoiceFromLibrary}
        savedVoiceIds={voices.map((v) => v.voice_id)}
      />

      {/* Voice Designer Modal */}
      <VoiceDesignerModal
        isOpen={showVoiceDesigner}
        onClose={() => setShowVoiceDesigner(false)}
        onVoiceSaved={() => {
          fetchVoices()
          setShowVoiceDesigner(false)
        }}
      />
    </div>
  )
}
