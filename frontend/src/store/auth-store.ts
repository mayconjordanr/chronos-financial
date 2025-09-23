import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthState, User } from '@/types/auth'
import { apiClient } from '@/lib/api-client'

interface AuthStore extends AuthState {
  login: (email: string, tenantId?: string) => Promise<void>
  verifyToken: (token: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, tenantId?: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.login(email, tenantId)
          set({ isLoading: false })
          // Magic link sent, no need to set user yet
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed'
          })
          throw error
        }
      },

      verifyToken: async (token: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await apiClient.verifyToken(token)
          apiClient.setAuth(response.access_token)
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Token verification failed',
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await apiClient.logout()
        } catch (error) {
          // Even if logout fails on server, clear local state
          console.error('Logout error:', error)
        } finally {
          apiClient.clearAuth()
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      loadUser: () => {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser)
            apiClient.loadAuth()
            set({
              user,
              isAuthenticated: true,
            })
          } catch (error) {
            console.error('Failed to load stored user:', error)
            localStorage.removeItem('user')
          }
        }
      },

      setError: (error: string | null) => {
        set({ error })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)