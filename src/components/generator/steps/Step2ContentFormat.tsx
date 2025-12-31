'use client'

import {
  Linkedin,
  Twitter,
  FileText,
  BookOpen,
  Mail,
  Youtube,
  Film,
  Music,
  Instagram,
  Video,
} from 'lucide-react'
import type { WizardData } from '@/hooks/useWizard'

const CONTENT_FORMATS = [
  { id: 'linkedin', label: 'LinkedIn Post', icon: Linkedin, description: 'Professional post for LinkedIn feed' },
  { id: 'twitter', label: 'Twitter/X Thread', icon: Twitter, description: 'Multi-tweet thread format' },
  { id: 'blog-short', label: 'Blog (Short)', icon: FileText, description: '500-800 word article' },
  { id: 'blog-long', label: 'Blog (Long Form)', icon: BookOpen, description: '1500+ word in-depth article' },
  { id: 'newsletter', label: 'Newsletter', icon: Mail, description: 'Email newsletter format' },
  { id: 'youtube-script', label: 'YouTube Script', icon: Youtube, description: 'Full video script with hooks' },
  { id: 'youtube-short', label: 'YouTube Short', icon: Film, description: '60-second short video script' },
  { id: 'tiktok', label: 'TikTok Script', icon: Music, description: 'Viral short-form video script' },
  { id: 'instagram-reel', label: 'Instagram Reel', icon: Instagram, description: 'Reel-optimized video script' },
  { id: 'explainer-video', label: 'Explainer Video', icon: Video, description: 'Educational video script' },
]

interface Step2Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
}

export function Step2ContentFormat({ data, updateData }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Choose Content Format
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select the type of content you want to generate from your transcripts.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CONTENT_FORMATS.map((format) => {
          const Icon = format.icon
          const isSelected = data.format === format.id

          return (
            <button
              key={format.id}
              type="button"
              onClick={() => updateData({ format: format.id })}
              className={`
                relative flex flex-col items-center p-4 rounded-xl border-2
                transition-all duration-200 group
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }
              `}
            >
              <div
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center mb-3
                  transition-colors
                  ${isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                  }
                `}
              >
                <Icon className="w-6 h-6" />
              </div>

              <span
                className={`
                  text-sm font-medium text-center
                  ${isSelected
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                {format.label}
              </span>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {format.description}
              </div>
            </button>
          )
        })}
      </div>

      {data.format && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-900 dark:text-white">Selected: </span>
            {CONTENT_FORMATS.find(f => f.id === data.format)?.description}
          </p>
        </div>
      )}
    </div>
  )
}
