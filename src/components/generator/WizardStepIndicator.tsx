'use client'

import { Check, FileText, LayoutGrid, MessageSquare, Image } from 'lucide-react'
import type { WizardStep } from '@/hooks/useWizard'

interface Step {
  number: WizardStep
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const STEPS: Step[] = [
  { number: 1, label: 'Source', icon: FileText },
  { number: 2, label: 'Format', icon: LayoutGrid },
  { number: 3, label: 'Voice', icon: MessageSquare },
  { number: 4, label: 'Options', icon: Image },
]

interface WizardStepIndicatorProps {
  currentStep: WizardStep
  completedSteps: Set<number>
  onStepClick: (step: WizardStep) => void
  canNavigateTo: (step: WizardStep) => boolean
}

export function WizardStepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
  canNavigateTo,
}: WizardStepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(step.number)
          const isCurrent = currentStep === step.number
          const isClickable = canNavigateTo(step.number)
          const Icon = step.icon

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full
                  transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : isCompleted
                      ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                      : isClickable
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                {isCompleted && !isCurrent ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </button>

              {/* Step Label */}
              <div className="ml-3 hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Step {step.number}
                </p>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-4">
                  <div
                    className={`h-0.5 ${
                      completedSteps.has(step.number)
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
