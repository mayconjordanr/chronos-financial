'use client'

import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useRequireAuth } from '@/lib/hooks/use-auth'

interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useRequireAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // The redirect is handled by useRequireAuth
    return null
  }

  return <>{children}</>
}