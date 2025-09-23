export interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'investment'
  balance: number
  currency: string
  institution: string
  account_number: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  account_id: string
  category_id?: string
  amount: number
  description: string
  date: string
  type: 'income' | 'expense' | 'transfer'
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
  parent_id?: string
  type: 'income' | 'expense'
  created_at: string
  updated_at: string
}

export interface Card {
  id: string
  account_id: string
  name: string
  last_four: string
  type: 'debit' | 'credit'
  brand: 'visa' | 'mastercard' | 'amex' | 'discover'
  expires_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  meta?: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status: number
}