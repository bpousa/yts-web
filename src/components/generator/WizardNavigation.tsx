'use client'

import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react'

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  canGoNext: boolean
  canGoBack: boolean
  onNext: () => void
  onBack: () => void
  onGenerate?: () => void
  isGenerating?: boolean
  isLastStep: boolean
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  canGoNext,
  canGoBack,
  onNext,
  onBack,
  onGenerate,
  isGenerating = false,
  isLastStep,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={!canGoBack || isGenerating}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
          transition-colors
          ${canGoBack && !isGenerating
            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          }
        `}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* Step Counter */}
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Step {currentStep} of {totalSteps}
      </span>

      {/* Next / Generate Button */}
      {isLastStep ? (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium
            transition-colors
            ${isGenerating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }
            text-white
          `}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Content
            </>
          )}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={!canGoNext || isGenerating}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium
            transition-colors
            ${canGoNext && !isGenerating
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
