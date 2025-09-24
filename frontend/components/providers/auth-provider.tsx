'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { User, AuthState, LoginCredentials, RegisterData } from '@/types/auth'
import { toast } from 'sonner'

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  const router = useRouter()

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('chronos_access_token')
        if (!token) {
          setState(prev => ({ ...prev, isLoading: false }))
          return
        }

        // Validate token by fetching user profile
        const user = await authApi.getProfile()

        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('chronos_access_token')
        localStorage.removeItem('chronos_refresh_token')

        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await authApi.login(credentials)

      // Store tokens
      localStorage.setItem('chronos_access_token', response.accessToken)
      localStorage.setItem('chronos_refresh_token', response.refreshToken)

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      toast.success('Welcome back!', {
        description: `Logged in as ${response.user.firstName} ${response.user.lastName}`,
      })

      // Redirect to dashboard
      router.push('/dashboard')

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      toast.error('Login failed', {
        description: errorMessage,
      })

      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await authApi.register(data)

      // Store tokens
      localStorage.setItem('chronos_access_token', response.accessToken)
      localStorage.setItem('chronos_refresh_token', response.refreshToken)

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      toast.success('Account created successfully!', {
        description: `Welcome to CHRONOS, ${response.user.firstName}!`,
      })

      // Redirect to dashboard
      router.push('/dashboard/onboarding')

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed'

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }))

      toast.error('Registration failed', {
        description: errorMessage,
      })

      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error)
    }

    // Clear local storage
    localStorage.removeItem('chronos_access_token')
    localStorage.removeItem('chronos_refresh_token')

    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })

    toast.success('Logged out successfully')

    // Redirect to home
    router.push('/')
  }

  const refreshAuth = async () => {
    try {
      const user = await authApi.getProfile()

      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        error: null,
      }))
    } catch (error) {
      console.error('Failed to refresh auth:', error)
    }
  }

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}