/**
 * Skeleton loading components for various UI patterns
 */

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTranscriptItem() {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-transparent">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-3" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center justify-between mt-2">
        <Skeleton className="h-3 w-12" />
        <div className="flex gap-1">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-6 rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonVideoResult() {
  return (
    <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-transparent">
      <Skeleton className="w-40 h-24 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-4 mt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
    </div>
  )
}

export function SkeletonToneProfile() {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      <Skeleton className="h-20 w-full mt-3 rounded" />
    </div>
  )
}

export function SkeletonWebhook() {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-transparent">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2 h-2 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-3 w-full mt-2" />
    </div>
  )
}

export function SkeletonContentGenerator() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-4 h-4 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
