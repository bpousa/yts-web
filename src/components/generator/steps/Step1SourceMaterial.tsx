'use client'

import { ProjectSelector } from '../ProjectSelector'
import { TranscriptSelector } from '../TranscriptSelector'
import type { WizardData } from '@/hooks/useWizard'

interface Step1Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
}

export function Step1SourceMaterial({ data, updateData }: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Select Source Material
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose the transcripts to use for content generation. Select up to 3 transcripts to combine.
        </p>
      </div>

      <ProjectSelector
        selectedProjectId={data.projectId}
        onProjectSelect={(projectId) => {
          updateData({
            projectId,
            // Clear transcript selection when project changes
            transcriptIds: [],
          })
        }}
      />

      <TranscriptSelector
        projectId={data.projectId}
        selectedTranscripts={data.transcriptIds}
        onSelectionChange={(transcriptIds) => updateData({ transcriptIds })}
        maxSelections={3}
      />
    </div>
  )
}
