export interface PaginationData {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

export interface FilterOptions {
  search?: string
  date_from?: string
  date_to?: string
  category_id?: string
  account_id?: string
  type?: string
  status?: string
}

export interface DashboardStats {
  total_balance: number
  income_this_month: number
  expenses_this_month: number
  transactions_count: number
  accounts_count: number
  recent_transactions: Transaction[]
}

export interface ChartData {
  date: string
  income: number
  expenses: number
  balance: number
}

import { Transaction } from './api'