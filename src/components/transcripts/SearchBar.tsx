'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string, searchIn: 'title' | 'content' | 'both') => void
  placeholder?: string
  debounceMs?: number
}

export function SearchBar({
  onSearch,
  placeholder = 'Search transcripts...',
  debounceMs = 300,
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [searchIn, setSearchIn] = useState<'title' | 'content' | 'both'>('both')

  // Debounced search
  const debouncedSearch = useCallback(
    (searchQuery: string, searchMode: 'title' | 'content' | 'both') => {
      onSearch(searchQuery, searchMode)
    },
    [onSearch]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedSearch(query, searchIn)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, searchIn, debounceMs, debouncedSearch])

  const clearSearch = () => {
    setQuery('')
  }

  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Mode Toggle */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setSearchIn('title')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            searchIn === 'title'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Titles
        </button>
        <button
          onClick={() => setSearchIn('content')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            searchIn === 'content'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Content
        </button>
        <button
          onClick={() => setSearchIn('both')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            searchIn === 'both'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Both
        </button>
      </div>
    </div>
  )
}
