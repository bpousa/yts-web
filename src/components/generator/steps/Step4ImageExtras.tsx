'use client'

import { Image, Palette, Sun, PenTool } from 'lucide-react'
import type { WizardData } from '@/hooks/useWizard'

const IMAGE_STYLES = [
  { id: 'photorealistic', label: 'Photorealistic' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'infographic', label: 'Infographic' },
  { id: '3d-render', label: '3D Render' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'hand-drawn', label: 'Hand Drawn' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'oil-painting', label: 'Oil Painting' },
  { id: 'corporate-tech', label: 'Corporate Tech' },
]

const IMAGE_MOODS = [
  { id: 'professional', label: 'Professional' },
  { id: 'vibrant', label: 'Vibrant' },
  { id: 'dark-moody', label: 'Dark & Moody' },
  { id: 'soft-light', label: 'Soft Light' },
  { id: 'futuristic', label: 'Futuristic' },
]

interface Step4Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
}

export function Step4ImageExtras({ data, updateData }: Step4Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Additional Options
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure image generation and add custom instructions. All options are optional.
        </p>
      </div>

      {/* Image Generation Toggle */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={data.generateImage}
              onChange={(e) => updateData({ generateImage: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-blue-500 transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Generate Image
            </span>
          </div>
        </label>

        {data.generateImage && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Image Style */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Palette className="w-4 h-4" />
                Image Style
              </label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => updateData({ imageStyle: style.id })}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-colors
                      ${data.imageStyle === style.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Mood */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Sun className="w-4 h-4" />
                Image Mood
              </label>
              <div className="flex flex-wrap gap-2">
                {IMAGE_MOODS.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => updateData({ imageMood: mood.id })}
                    className={`
                      px-3 py-1.5 rounded-full text-sm transition-colors
                      ${data.imageMood === mood.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    {mood.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Image Prompt */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <PenTool className="w-4 h-4" />
                Custom Image Prompt (Optional)
              </label>
              <input
                type="text"
                value={data.customImagePrompt}
                onChange={(e) => updateData({ customImagePrompt: e.target.value })}
                placeholder="e.g., Include a laptop and coffee cup"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Add specific elements you want in the image
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Custom Instructions (Optional)
        </label>
        <textarea
          value={data.customInstructions}
          onChange={(e) => updateData({ customInstructions: e.target.value })}
          rows={4}
          placeholder="Add any specific instructions for content generation..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Examples: "Focus on actionable tips", "Include statistics", "Keep it under 500 words"
        </p>
      </div>

      {/* Summary */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          Ready to Generate
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Click "Generate Content" below to create your content based on the selected options.
          {data.generateImage && ' An image will also be generated.'}
        </p>
      </div>
    </div>
  )
}
