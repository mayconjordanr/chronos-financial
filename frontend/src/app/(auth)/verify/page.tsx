import { Suspense } from 'react'
import { MagicLinkVerification } from '@/components/auth/magic-link-form'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Verify Sign In | Chronos Financial',
  description: 'Verify your magic link to sign in',
}

function VerifyPageContent() {
  return <MagicLinkVerification />
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  )
}