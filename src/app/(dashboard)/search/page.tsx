'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Search, Filter, Plus, Loader2, ExternalLink, Eye, Calendar } from 'lucide-react'
import { SkeletonVideoResult } from '@/components/ui/Skeleton'

interface VideoResult {
  id: string
  title: string
  channelTitle: string
  description: string
  thumbnailUrl: string
  publishedAt: string
  viewCount?: string
  duration?: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState(10)
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'rating' | 'viewCount' | 'title'>('relevance')
  const [duration, setDuration] = useState<'any' | 'short' | 'medium' | 'long'>('any')
  const [uploadDate, setUploadDate] = useState<'any' | 'day' | 'week' | 'month' | 'year'>('any')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VideoResult[]>([])
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [addingToQueue, setAddingToQueue] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResults([])

    try {
      const params = new URLSearchParams({
        query: query,
        maxResults: maxResults.toString(),
        order: sortBy,
        videoDuration: duration,
        publishedAfter: uploadDate,
      })

      const response = await fetch(`/api/youtube/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.videos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleVideoSelection = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }

  const addToQueue = async () => {
    if (selectedVideos.length === 0) {
      toast.error('No videos selected')
      return
    }

    setAddingToQueue(true)

    try {
      const urls = selectedVideos.map(id => `https://www.youtube.com/watch?v=${id}`)

      const response = await fetch('/api/transcripts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
          includeTimestamps: false,
          enableFallback: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add to queue')
      }

      const data = await response.json()
      const successCount = data.successful?.length || 0
      const failCount = data.failed?.length || 0

      if (successCount > 0) {
        toast.success(`Added ${successCount} transcript(s) to your library`)
      }
      if (failCount > 0) {
        toast.error(`${failCount} video(s) failed to fetch`)
      }
      setSelectedVideos([])
    } catch (err) {
      toast.error('Failed to add videos to transcript queue')
    } finally {
      setAddingToQueue(false)
    }
  }

  const formatViewCount = (count?: string) => {
    if (!count) return null
    const num = parseInt(count, 10)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M views`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K views`
    return `${num} views`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Search Videos
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Find YouTube videos to add to your transcript queue.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Search Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search YouTube videos..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 border rounded-lg transition-colors ${
              showFilters
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 text-blue-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Results
              </label>
              <input
                type="range"
                min={5}
                max={50}
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{maxResults}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="viewCount">View Count</option>
                <option value="rating">Rating</option>
                <option value="title">Title</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as typeof duration)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="any">Any</option>
                <option value="short">Short (&lt;4 min)</option>
                <option value="medium">Medium (4-20 min)</option>
                <option value="long">Long (&gt;20 min)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Date
              </label>
              <select
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value as typeof uploadDate)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="any">Any Time</option>
                <option value="day">Last 24 Hours</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Selected Videos Actions */}
        {selectedVideos.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <span className="text-blue-700 dark:text-blue-400 font-medium">
              {selectedVideos.length} video(s) selected
            </span>
            <button
              onClick={addToQueue}
              disabled={addingToQueue}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              {addingToQueue ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Transcript Queue
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonVideoResult key={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Found {results.length} videos
            </p>
            {results.map((video) => (
              <div
                key={video.id}
                onClick={() => toggleVideoSelection(video.id)}
                className={`flex gap-4 p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedVideos.includes(video.id)
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-40 h-24 bg-gray-200 dark:bg-gray-600 rounded-lg flex-shrink-0 overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No thumbnail
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {video.channelTitle}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {video.viewCount && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViewCount(video.viewCount)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(video.publishedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                    {video.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2">
                  <input
                    type="checkbox"
                    checked={selectedVideos.includes(video.id)}
                    onChange={() => {}}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <a
                    href={`https://youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Watch
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && query && !error && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              No videos found. Try a different search term.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!loading && results.length === 0 && !query && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              Enter a search term to find YouTube videos
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
