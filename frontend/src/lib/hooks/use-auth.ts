import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

export function useAuth() {
  const router = useRouter()
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    verifyToken,
    logout,
    loadUser,
    setError,
    clearError,
  } = useAuthStore()

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const redirectToLogin = () => {
    router.push('/login')
  }

  const redirectToDashboard = () => {
    router.push('/dashboard')
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    verifyToken,
    logout,
    setError,
    clearError,
    redirectToLogin,
    redirectToDashboard,
  }
}

export function useRequireAuth() {
  const { isAuthenticated, isLoading, redirectToLogin } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirectToLogin()
    }
  }, [isAuthenticated, isLoading, redirectToLogin])

  return { isAuthenticated, isLoading }
}