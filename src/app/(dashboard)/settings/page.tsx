'use client'

import { useState, useEffect } from 'react'
import { Loader2, Trash2, Edit2, Save, X, ExternalLink, Link as LinkIcon } from 'lucide-react'

interface ToneProfile {
  id: string
  name: string
  styleDna: string
  sampleText?: string
  sourceUrl?: string
  createdAt: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'tones' | 'preferences'>('tones')

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
  const [error, setError] = useState<string | null>(null)

  // Preferences State
  const [defaultAiFallback, setDefaultAiFallback] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  // Fetch profiles on mount
  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/tones')
      const data = await response.json()
      setProfiles(data.profiles || [])
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
    } finally {
      setLoadingProfiles(false)
    }
  }

  const handleAnalyzeTone = async () => {
    if (!sampleText.trim() && !sampleUrl.trim()) return

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzingTone(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !analyzedDna.trim()) return

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
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
    if (!editName.trim() || !editDna.trim()) return

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
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleDeleteProfile = async (id: string) => {
    setDeletingProfile(id)

    try {
      const response = await fetch(`/api/tones/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete profile')
      }

      setProfiles((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Failed to delete profile:', err)
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
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
                              onClick={() => handleDeleteProfile(profile.id)}
                              disabled={deletingProfile === profile.id}
                              className="p-2 text-gray-500 hover:text-red-600 transition-colors"
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
    </div>
  )
}
