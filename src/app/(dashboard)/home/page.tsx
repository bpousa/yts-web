'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  FileText,
  Sparkles,
  Headphones,
  Settings,
  Webhook,
  ArrowRight,
  Clock,
  TrendingUp,
  Plus
} from 'lucide-react'

interface QuickStat {
  label: string
  value: number
  loading: boolean
}

export default function DashboardHomePage() {
  const [stats, setStats] = useState<Record<string, QuickStat>>({
    transcripts: { label: 'Transcripts', value: 0, loading: true },
    podcasts: { label: 'Podcasts', value: 0, loading: true },
  })

  useEffect(() => {
    // Fetch transcript count
    fetch('/api/transcripts')
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          transcripts: { ...prev.transcripts, value: data.transcripts?.length || 0, loading: false }
        }))
      })
      .catch(() => {
        setStats(prev => ({
          ...prev,
          transcripts: { ...prev.transcripts, loading: false }
        }))
      })

    // Fetch podcast count
    fetch('/api/podcast/jobs')
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          podcasts: { ...prev.podcasts, value: data.jobs?.length || 0, loading: false }
        }))
      })
      .catch(() => {
        setStats(prev => ({
          ...prev,
          podcasts: { ...prev.podcasts, loading: false }
        }))
      })
  }, [])

  const quickActions = [
    {
      title: 'Search Videos',
      description: 'Find YouTube videos to transcribe',
      icon: Search,
      href: '/search',
      color: 'blue'
    },
    {
      title: 'Fetch Transcript',
      description: 'Get transcript from a YouTube URL',
      icon: FileText,
      href: '/fetch',
      color: 'green'
    },
    {
      title: 'Generate Content',
      description: 'Create articles from transcripts',
      icon: Sparkles,
      href: '/generator',
      color: 'purple'
    },
    {
      title: 'Create Podcast',
      description: 'Generate AI podcast audio',
      icon: Headphones,
      href: '/podcast',
      color: 'pink'
    }
  ]

  const features = [
    {
      title: 'Transcripts',
      description: 'View and manage your saved transcripts',
      icon: FileText,
      href: '/transcripts',
      stat: stats.transcripts
    },
    {
      title: 'Podcasts',
      description: 'View your generated podcast episodes',
      icon: Headphones,
      href: '/podcast',
      stat: stats.podcasts
    },
    {
      title: 'Settings',
      description: 'Configure voices, tones, and pronunciations',
      icon: Settings,
      href: '/settings',
      stat: null
    },
    {
      title: 'Webhooks',
      description: 'Automate your content publishing',
      icon: Webhook,
      href: '/webhooks',
      stat: null
    }
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    pink: 'bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400',
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome Back
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          What would you like to do today?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg ${colorClasses[action.color]} flex items-center justify-center mb-3`}>
                <action.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Features & Stats */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Your Content
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <feature.icon className="w-5 h-5" />
                </div>
                {feature.stat && (
                  <div className="text-right">
                    {feature.stat.loading ? (
                      <div className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {feature.stat.value}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Workflow Guide */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white">
        <h2 className="text-xl font-bold mb-4">
          Typical Workflow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Search', desc: 'Find videos', icon: Search },
            { step: '2', title: 'Fetch', desc: 'Get transcripts', icon: FileText },
            { step: '3', title: 'Generate', desc: 'Create content', icon: Sparkles },
            { step: '4', title: 'Publish', desc: 'Share or podcast', icon: Headphones },
          ].map((item, i) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {item.step}
              </div>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-blue-100">{item.desc}</p>
              </div>
              {i < 3 && (
                <ArrowRight className="hidden md:block w-5 h-5 text-white/50 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
