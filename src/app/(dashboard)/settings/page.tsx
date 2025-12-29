'use client'

import { useState } from 'react'
import { Loader2, Trash2, Edit2, Save, Plus, X } from 'lucide-react'

interface ToneProfile {
  id: string
  name: string
  styleDna: string
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
  const [editingProfile, setEditingProfile] = useState<string | null>(null)

  // Preferences State
  const [defaultAiFallback, setDefaultAiFallback] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleAnalyzeTone = async () => {
    if (!sampleText.trim() && !sampleUrl.trim()) return

    setAnalyzingTone(true)
    // TODO: Implement tone analysis via API route
    setTimeout(() => {
      setAnalyzingTone(false)
      setAnalyzedDna(`Voice & Tone:
- Direct and conversational, like a mentor speaking to a peer
- Confident but not arrogant; shares knowledge generously
- Uses "you" frequently to create personal connection

Sentence Structure:
- Mix of short punchy sentences and medium-length explanations
- Occasional questions to engage the reader
- Lists and bullet points for clarity

Vocabulary:
- Accessible, avoids jargon unless explaining it
- Action verbs that inspire movement
- Real-world examples and analogies`)
    }, 2000)
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !analyzedDna.trim()) return

    const newProfile: ToneProfile = {
      id: Date.now().toString(),
      name: profileName,
      styleDna: analyzedDna,
      createdAt: new Date().toISOString(),
    }

    setProfiles((prev) => [...prev, newProfile])
    setProfileName('')
    setAnalyzedDna('')
    setSampleText('')
    setSampleUrl('')
  }

  const handleDeleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
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
                  placeholder="Paste a sample of writing that represents the tone you want to clone..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
                />
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
                <input
                  type="url"
                  value={sampleUrl}
                  onChange={(e) => setSampleUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
                />
              </div>

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
                      disabled={!profileName.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
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

            {profiles.length === 0 ? (
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
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {profile.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Created {new Date(profile.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingProfile(profile.id)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {editingProfile === profile.id && (
                      <div className="mt-4">
                        <textarea
                          defaultValue={profile.styleDna}
                          rows={8}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                        />
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={() => setEditingProfile(null)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Save Changes
                          </button>
                        </div>
                      </div>
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
        </div>
      )}
    </div>
  )
}
