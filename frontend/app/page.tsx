'use client'

import { useAuth } from '@/hooks/useAuth'
import { LandingPage } from '@/components/marketing/landing-page'
import { DashboardRedirect } from '@/components/dashboard/dashboard-redirect'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated && user) {
    return <DashboardRedirect />
  }

  return <LandingPage />
}