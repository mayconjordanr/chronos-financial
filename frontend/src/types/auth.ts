export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  tenant_id: string
  role: 'admin' | 'user' | 'viewer'
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
  tenant_id?: string
}

export interface VerifyTokenRequest {
  token: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
  expires_at: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}