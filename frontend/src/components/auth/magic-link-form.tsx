'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/lib/hooks/use-auth'

export function MagicLinkVerification() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyToken, isLoading, error, redirectToDashboard } = useAuth()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('error')
      return
    }

    const verify = async () => {
      try {
        await verifyToken(token)
        setStatus('success')
        setTimeout(() => {
          redirectToDashboard()
        }, 2000)
      } catch (error) {
        setStatus('error')
      }
    }

    verify()
  }, [searchParams, verifyToken, redirectToDashboard])

  if (status === 'verifying' || isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
          <CardTitle>Verifying your link</CardTitle>
          <CardDescription>
            Please wait while we verify your magic link...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle>Welcome back!</CardTitle>
          <CardDescription>
            You&apos;ve been successfully signed in. Redirecting to your dashboard...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle>Verification failed</CardTitle>
        <CardDescription>
          Your magic link is invalid or has expired
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Magic links expire after 15 minutes for security reasons.
          </p>

          <Button
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Request a new link
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}