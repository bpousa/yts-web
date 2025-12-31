'use client'

import { useState, useCallback, useMemo } from 'react'

export interface WizardData {
  // Step 1: Source Material
  projectId: string | null
  transcriptIds: string[]
  // Step 2: Content Format
  format: string
  // Step 3: Voice/Tone
  voice: string
  toneProfileId: string | null
  // Step 4: Image & Extras
  generateImage: boolean
  imageStyle: string
  imageMood: string
  customImagePrompt: string
  customInstructions: string
}

export type WizardStep = 1 | 2 | 3 | 4

const INITIAL_DATA: WizardData = {
  projectId: null,
  transcriptIds: [],
  format: 'linkedin',
  voice: 'professional',
  toneProfileId: null,
  generateImage: false,
  imageStyle: 'photorealistic',
  imageMood: 'professional',
  customImagePrompt: '',
  customInstructions: '',
}

export interface UseWizardReturn {
  currentStep: WizardStep
  completedSteps: Set<number>
  data: WizardData

  // Navigation
  goToStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void
  canNavigateTo: (step: WizardStep) => boolean

  // Data management
  updateData: (partial: Partial<WizardData>) => void
  resetWizard: () => void

  // Validation
  isStepValid: (step: WizardStep) => boolean
  isCurrentStepValid: boolean
  canProceed: boolean

  // State
  isFirstStep: boolean
  isLastStep: boolean
}

export function useWizard(initialData?: Partial<WizardData>): UseWizardReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [data, setData] = useState<WizardData>({
    ...INITIAL_DATA,
    ...initialData,
  })

  // Step validation logic
  const isStepValid = useCallback((step: WizardStep): boolean => {
    switch (step) {
      case 1:
        // Must have at least one transcript selected
        return data.transcriptIds.length > 0
      case 2:
        // Must have a format selected
        return data.format.length > 0
      case 3:
        // Must have a voice selected
        // If clone tone, must also have a tone profile selected
        if (data.voice === 'clone') {
          return !!data.toneProfileId
        }
        return data.voice.length > 0
      case 4:
        // All optional, always valid
        return true
      default:
        return false
    }
  }, [data])

  const isCurrentStepValid = useMemo(() => isStepValid(currentStep), [currentStep, isStepValid])
  const canProceed = isCurrentStepValid

  // Navigation
  const canNavigateTo = useCallback((step: WizardStep): boolean => {
    // Can always go back
    if (step < currentStep) return true
    // Can only go forward if all previous steps are valid
    for (let i = 1; i < step; i++) {
      if (!isStepValid(i as WizardStep)) return false
    }
    return true
  }, [currentStep, isStepValid])

  const goToStep = useCallback((step: WizardStep) => {
    if (canNavigateTo(step)) {
      // Mark current step as completed if valid
      if (isStepValid(currentStep)) {
        setCompletedSteps(prev => new Set([...prev, currentStep]))
      }
      setCurrentStep(step)
    }
  }, [canNavigateTo, currentStep, isStepValid])

  const nextStep = useCallback(() => {
    if (currentStep < 4 && isCurrentStepValid) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep((currentStep + 1) as WizardStep)
    }
  }, [currentStep, isCurrentStepValid])

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep)
    }
  }, [currentStep])

  // Data management
  const updateData = useCallback((partial: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...partial }))
  }, [])

  const resetWizard = useCallback(() => {
    setCurrentStep(1)
    setCompletedSteps(new Set())
    setData({ ...INITIAL_DATA, ...initialData })
  }, [initialData])

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === 4

  return {
    currentStep,
    completedSteps,
    data,
    goToStep,
    nextStep,
    prevStep,
    canNavigateTo,
    updateData,
    resetWizard,
    isStepValid,
    isCurrentStepValid,
    canProceed,
    isFirstStep,
    isLastStep,
  }
}
