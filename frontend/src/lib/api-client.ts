import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { AuthResponse, User } from '@/types/auth'
import { ApiResponse, ApiError } from '@/types/api'

class ApiClient {
  private instance: AxiosInstance
  private accessToken: string | null = null

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.clearAuth()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(this.handleError(error))
      }
    )
  }

  private handleError(error: any): ApiError {
    if (error.response) {
      return {
        message: error.response.data?.message || 'An error occurred',
        errors: error.response.data?.errors,
        status: error.response.status,
      }
    }
    return {
      message: error.message || 'Network error',
      status: 0,
    }
  }

  setAuth(token: string) {
    this.accessToken = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token)
    }
  }

  clearAuth() {
    this.accessToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    }
  }

  loadAuth() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) {
        this.accessToken = token
      }
    }
  }

  // Auth endpoints
  async login(email: string, tenantId?: string): Promise<{ message: string }> {
    const response = await this.instance.post('/auth/login', {
      email,
      tenant_id: tenantId,
    })
    return response.data
  }

  async verifyToken(token: string): Promise<AuthResponse> {
    const response = await this.instance.post('/auth/verify', { token })
    return response.data
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.instance.post('/auth/refresh')
    return response.data
  }

  async logout(): Promise<void> {
    await this.instance.post('/auth/logout')
    this.clearAuth()
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.put(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.instance.delete(url, config)
    return response.data
  }
}

export const apiClient = new ApiClient()