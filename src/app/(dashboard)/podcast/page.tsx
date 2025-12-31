'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Mic,
  FileText,
  Sparkles,
  Loader2,
  Play,
  Download,
  ChevronDown,
  User,
  Clock,
  MessageSquare,
} from 'lucide-react'

// Types
interface GeneratedContent {
  id: string
  format: string
  createdAt: string
}

interface Transcript {
  id: string
  videoId: string
  title: string
  content: string
  projectId?: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
}

interface SavedVoice {
  id: string
  voice_id: string
  name: string
  preview_url: string | null
  is_default_host1: boolean
  is_default_host2: boolean
}

// Default host role descriptions
const DEFAULT_HOST_ROLES = {
  host1: 'Asks clarifying questions, plays devil\'s advocate, represents the audience\'s perspective',
  host2: 'Explains concepts with enthusiasm, provides examples and analogies',
}

interface PodcastSegment {
  speaker: string
  text: string
  emotion?: string
}

interface PodcastScript {
  title: string
  segments: PodcastSegment[]
  keyTakeaways?: string[]
}

// Duration options
const DURATIONS = [
  { id: 'short', label: 'Short', description: '3-5 min', words: '600-900 words' },
  { id: 'medium', label: 'Medium', description: '8-12 min', words: '1500-2200 words' },
  { id: 'long', label: 'Long', description: '15-20 min', words: '2800-3800 words' },
]

// Tone options
const TONES = [
  { id: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { id: 'professional', label: 'Professional', description: 'Business-focused' },
  { id: 'educational', label: 'Educational', description: 'Instructive and clear' },
]

function PodcastContent() {
  const searchParams = useSearchParams()
  const contentIdFromUrl = searchParams.get('contentId')

  // Source selection
  const [sourceMode, setSourceMode] = useState<'content' | 'transcripts'>(
    contentIdFromUrl ? 'content' : 'content'
  )
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[]>([])
  const [selectedContentId, setSelectedContentId] = useState<string | null>(contentIdFromUrl)
  const [loadingContents, setLoadingContents] = useState(true)

  // Transcript state
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedTranscriptIds, setSelectedTranscriptIds] = useState<string[]>([])
  const [loadingTranscripts, setLoadingTranscripts] = useState(false)
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | null>(null)

  // Podcast options
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium')
  const [tone, setTone] = useState<'casual' | 'professional' | 'educational'>('casual')
  const [host1Name, setHost1Name] = useState('Alex')
  const [host2Name, setHost2Name] = useState('Jamie')
  const [host1Role, setHost1Role] = useState(DEFAULT_HOST_ROLES.host1)
  const [host2Role, setHost2Role] = useState(DEFAULT_HOST_ROLES.host2)
  const [focusGuidance, setFocusGuidance] = useState('')
  const [includeIntro, setIncludeIntro] = useState(true)
  const [includeOutro, setIncludeOutro] = useState(true)

  // Voice selection
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([])
  const [host1VoiceId, setHost1VoiceId] = useState<string | null>(null)
  const [host2VoiceId, setHost2VoiceId] = useState<string | null>(null)
  const [loadingVoices, setLoadingVoices] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [podcastJobId, setPodcastJobId] = useState<string | null>(null)
  const [podcastScript, setPodcastScript] = useState<PodcastScript | null>(null)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Fetch user's generated contents and saved voices
  useEffect(() => {
    fetchGeneratedContents()
    fetchSavedVoices()
  }, [])

  const fetchSavedVoices = async () => {
    setLoadingVoices(true)
    try {
      const response = await fetch('/api/voices')
      const data = await response.json()
      setSavedVoices(data.voices || [])
    } catch (error) {
      console.error('Failed to fetch voices:', error)
    } finally {
      setLoadingVoices(false)
    }
  }

  // Fetch transcripts when switching to transcript mode
  useEffect(() => {
    if (sourceMode === 'transcripts' && transcripts.length === 0) {
      fetchTranscripts()
    }
  }, [sourceMode])

  const fetchGeneratedContents = async () => {
    try {
      // Fetch recent generated content
      const response = await fetch('/api/generate?limit=20')
      const data = await response.json()
      setGeneratedContents(data.contents || [])
    } catch (error) {
      console.error('Failed to fetch contents:', error)
    } finally {
      setLoadingContents(false)
    }
  }

  const fetchTranscripts = async () => {
    setLoadingTranscripts(true)
    try {
      const [transcriptsRes, projectsRes] = await Promise.all([
        fetch('/api/transcripts?limit=100'),
        fetch('/api/projects'),
      ])

      if (transcriptsRes.ok) {
        const data = await transcriptsRes.json()
        setTranscripts(data.transcripts || [])
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch transcripts:', error)
    } finally {
      setLoadingTranscripts(false)
    }
  }

  const toggleTranscriptSelection = (transcriptId: string) => {
    setSelectedTranscriptIds(prev =>
      prev.includes(transcriptId)
        ? prev.filter(id => id !== transcriptId)
        : [...prev, transcriptId]
    )
  }

  const filteredTranscripts = selectedProjectFilter
    ? transcripts.filter(t => t.projectId === selectedProjectFilter)
    : transcripts

  const handleGenerate = async () => {
    // Validate based on mode
    if (sourceMode === 'content' && !selectedContentId) {
      toast.error('Please select content to convert to podcast')
      return
    }
    if (sourceMode === 'transcripts' && selectedTranscriptIds.length === 0) {
      toast.error('Please select at least one transcript')
      return
    }

    setIsGenerating(true)
    setPodcastScript(null)

    try {
      let response: Response

      if (sourceMode === 'content') {
        // Generate from existing content
        response = await fetch('/api/generate/podcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: selectedContentId,
            targetDuration: duration,
            tone,
            hostNames: { host1: host1Name, host2: host2Name },
            hostRoles: { host1: host1Role, host2: host2Role },
            focusGuidance: focusGuidance || undefined,
            includeIntro,
            includeOutro,
            ttsProvider: 'none',
            voiceHost1: host1VoiceId || undefined,
            voiceHost2: host2VoiceId || undefined,
          }),
        })
      } else {
        // Generate from transcripts
        response = await fetch('/api/generate/podcast/from-transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcriptIds: selectedTranscriptIds,
            targetDuration: duration,
            tone,
            hostNames: { host1: host1Name, host2: host2Name },
            hostRoles: { host1: host1Role, host2: host2Role },
            focusGuidance: focusGuidance || undefined,
            includeIntro,
            includeOutro,
          }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate podcast')
      }

      setPodcastJobId(data.job.id)
      toast.success('Podcast script generated!')

      // Fetch the script
      const scriptResponse = await fetch(`/api/generate/podcast/${data.job.id}`)
      const scriptData = await scriptResponse.json()

      if (scriptData.script) {
        setPodcastScript(scriptData.script)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (format: 'txt' | 'srt') => {
    if (!podcastJobId) return

    try {
      const response = await fetch(`/api/generate/podcast/${podcastJobId}?export=${format}`)
      const blob = await response.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `podcast-script.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Downloaded as ${format.toUpperCase()}`)
    } catch {
      toast.error('Download failed')
    }
  }

  const handleStartOver = () => {
    setSelectedContentId(null)
    setPodcastScript(null)
    setPodcastJobId(null)
  }

  // Show results if we have a script
  const showResults = podcastScript !== null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Mic className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          Podcast Generator
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Convert your content into a two-host conversational podcast script
        </p>
      </div>

      {showResults ? (
        // Results View
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Podcast Script
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('txt')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                TXT
              </button>
              <button
                onClick={() => handleDownload('srt')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                SRT
              </button>
              <button
                onClick={handleStartOver}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 ml-2"
              >
                Create New
              </button>
            </div>
          </div>

          {/* Script Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {podcastScript.title}
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {podcastScript.segments.map((segment, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${
                    segment.speaker === host1Name
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                      : 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {segment.speaker}
                    </span>
                    {segment.emotion && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                        {segment.emotion}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {segment.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Key Takeaways */}
            {podcastScript.keyTakeaways && podcastScript.keyTakeaways.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Key Takeaways
                </h4>
                <ul className="space-y-2">
                  {podcastScript.keyTakeaways.map((takeaway, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-purple-500">•</span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Configuration View
        <div className="space-y-6">
          {/* Source Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Source
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSourceMode('content')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceMode === 'content'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                From Generated Content
              </button>
              <button
                onClick={() => setSourceMode('transcripts')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sourceMode === 'transcripts'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <FileText className="w-4 h-4" />
                From Transcripts
              </button>
            </div>

            {sourceMode === 'content' ? (
              loadingContents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : generatedContents.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No generated content yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Generate content first, then come back to create a podcast
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {generatedContents.map((content) => (
                    <button
                      key={content.id}
                      onClick={() => setSelectedContentId(content.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-colors ${
                        selectedContentId === content.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {content.format.replace('-', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(content.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : loadingTranscripts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : transcripts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No transcripts yet
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Fetch some transcripts first, then come back to create a podcast
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Project Filter */}
                {projects.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedProjectFilter(null)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedProjectFilter === null
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      All
                    </button>
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProjectFilter(project.id)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          selectedProjectFilter === project.id
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected count */}
                {selectedTranscriptIds.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <span className="text-sm text-purple-700 dark:text-purple-300">
                      {selectedTranscriptIds.length} transcript{selectedTranscriptIds.length !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={() => setSelectedTranscriptIds([])}
                      className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* Transcript list */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredTranscripts.map((transcript) => {
                    const isSelected = selectedTranscriptIds.includes(transcript.id)
                    const project = projects.find(p => p.id === transcript.projectId)

                    return (
                      <button
                        key={transcript.id}
                        onClick={() => toggleTranscriptSelection(transcript.id)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                                <path d="M9.5 3.5L5 8l-2.5-2.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {transcript.title}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">
                                {new Date(transcript.createdAt).toLocaleDateString()}
                              </span>
                              {project && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                                  {project.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Podcast Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Podcast Settings
            </h2>

            {/* Episode Focus */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Episode Focus (Optional)
              </label>
              <textarea
                value={focusGuidance}
                onChange={(e) => setFocusGuidance(e.target.value)}
                placeholder="Guide what the podcast should focus on. E.g., 'Focus on actionable sales tips, skip the personal stories, emphasize the key frameworks...'"
                rows={2}
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {focusGuidance.length}/500
              </p>
            </div>

            {/* Duration */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <Clock className="w-4 h-4" />
                Episode Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDuration(d.id as typeof duration)}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      duration === d.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{d.label}</p>
                    <p className="text-xs text-gray-500">{d.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <MessageSquare className="w-4 h-4" />
                Conversation Tone
              </label>
              <div className="grid grid-cols-3 gap-3">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id as typeof tone)}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      tone === t.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Host Configuration */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                <User className="w-4 h-4" />
                Host Configuration
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Host 1 */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Host 1</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={host1Name}
                      onChange={(e) => setHost1Name(e.target.value)}
                      maxLength={20}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Voice (Optional)</label>
                    <select
                      value={host1VoiceId || ''}
                      onChange={(e) => setHost1VoiceId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Use Default</option>
                      {savedVoices.map((voice) => (
                        <option key={voice.id} value={voice.voice_id}>
                          {voice.name}{voice.is_default_host1 ? ' (Default H1)' : ''}{voice.is_default_host2 ? ' (Default H2)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Role/Goal</label>
                    <textarea
                      value={host1Role}
                      onChange={(e) => setHost1Role(e.target.value)}
                      rows={2}
                      maxLength={200}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>

                {/* Host 2 */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Host 2</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={host2Name}
                      onChange={(e) => setHost2Name(e.target.value)}
                      maxLength={20}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Voice (Optional)</label>
                    <select
                      value={host2VoiceId || ''}
                      onChange={(e) => setHost2VoiceId(e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Use Default</option>
                      {savedVoices.map((voice) => (
                        <option key={voice.id} value={voice.voice_id}>
                          {voice.name}{voice.is_default_host1 ? ' (Default H1)' : ''}{voice.is_default_host2 ? ' (Default H2)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Role/Goal</label>
                    <textarea
                      value={host2Role}
                      onChange={(e) => setHost2Role(e.target.value)}
                      rows={2}
                      maxLength={200}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
              Advanced Options
            </button>

            {showAdvancedOptions && (
              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeIntro}
                    onChange={(e) => setIncludeIntro(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Include intro segment
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeOutro}
                    onChange={(e) => setIncludeOutro(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Include outro/wrap-up
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (sourceMode === 'content' ? !selectedContentId : selectedTranscriptIds.length === 0)}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white font-medium transition-all ${
              isGenerating || (sourceMode === 'content' ? !selectedContentId : selectedTranscriptIds.length === 0)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Podcast Script...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Generate Podcast Script
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default function PodcastPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <PodcastContent />
    </Suspense>
  )
}
