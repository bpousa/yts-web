'use client'

import { useState } from 'react'
import { Search, Filter, Plus, Loader2 } from 'lucide-react'

interface VideoResult {
  id: string
  title: string
  channel: string
  description: string
  thumbnail: string
  duration: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState(10)
  const [sortBy, setSortBy] = useState('relevance')
  const [duration, setDuration] = useState('any')
  const [uploadDate, setUploadDate] = useState('any')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VideoResult[]>([])
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])

  const handleSearch = async () => {
    setLoading(true)
    // TODO: Implement YouTube search via API route
    setTimeout(() => {
      setLoading(false)
      setResults([
        {
          id: 'demo1',
          title: 'Example Video Title That Might Be Long',
          channel: 'Example Channel',
          description: 'This is a description of the video content...',
          thumbnail: '/placeholder.jpg',
          duration: '12:34',
        },
        {
          id: 'demo2',
          title: 'Another Great Video About the Topic',
          channel: 'Another Channel',
          description: 'Another description here with more details...',
          thumbnail: '/placeholder.jpg',
          duration: '8:45',
        },
      ])
    }, 1500)
  }

  const toggleVideoSelection = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }

  const addToQueue = () => {
    // TODO: Add selected videos to transcript queue
    alert(`Added ${selectedVideos.length} videos to transcript queue`)
    setSelectedVideos([])
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
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="relevance">Relevance</option>
                <option value="date">Date</option>
                <option value="viewCount">View Count</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
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
                onChange={(e) => setUploadDate(e.target.value)}
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

        {/* Selected Videos Actions */}
        {selectedVideos.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <span className="text-blue-700 dark:text-blue-400 font-medium">
              {selectedVideos.length} video(s) selected
            </span>
            <button
              onClick={addToQueue}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add to Transcript Queue
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
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
                <div className="w-40 h-24 bg-gray-200 dark:bg-gray-600 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
                  {video.duration}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {video.channel}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                    {video.description}
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedVideos.includes(video.id)}
                    onChange={() => {}}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
