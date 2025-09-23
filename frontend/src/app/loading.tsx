import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-[120px]" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-[150px]" />
          <div className="border rounded-lg p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <div className="flex space-x-2">
                  <Skeleton className="h-3 w-[80px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-6 w-[150px]" />
          <div className="border rounded-lg p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[180px]" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
                <Skeleton className="h-4 w-[80px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}