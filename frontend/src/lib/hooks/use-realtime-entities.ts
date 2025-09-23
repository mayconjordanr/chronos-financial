import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtime } from './use-realtime'
import { Account, Transaction, Category, Card } from '@/types/api'
import { toast } from 'sonner'

// Interfaces for real-time events
interface RealTimeEvent<T = any> {
  type: string
  data: T
  timestamp: number
  userId?: string
  tenantId?: string
}

interface EntityEvent<T> extends RealTimeEvent<T> {
  entity: T
  entityId: string
}

interface BulkUpdateEvent<T> extends RealTimeEvent<T[]> {
  entities: T[]
  entityIds: string[]
}

// Transactions Real-time Hook
export function useRealtimeTransactions(options: {
  showNotifications?: boolean
  onUpdate?: (transaction: Transaction) => void
  onCreate?: (transaction: Transaction) => void
  onDelete?: (transactionId: string) => void
} = {}) {
  const { showNotifications = true, onUpdate, onCreate, onDelete } = options
  const queryClient = useQueryClient()

  const { isConnected, error } = useRealtime(['transactions'], {
    onMessage: useCallback((data: RealTimeEvent) => {
      switch (data.type) {
        case 'transaction:created': {
          const event = data as EntityEvent<Transaction>
          const transaction = event.entity

          // Update React Query cache
          queryClient.setQueryData(['transactions'], (old: Transaction[] = []) => {
            // Check if transaction already exists to avoid duplicates
            const exists = old.some(t => t.id === transaction.id)
            return exists ? old : [transaction, ...old]
          })

          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          if (showNotifications) {
            toast.success(`New transaction: ${transaction.description}`)
          }

          onCreate?.(transaction)
          break
        }

        case 'transaction:updated': {
          const event = data as EntityEvent<Transaction>
          const transaction = event.entity

          // Update React Query cache
          queryClient.setQueryData(['transactions'], (old: Transaction[] = []) => {
            return old.map(t => t.id === transaction.id ? transaction : t)
          })

          // Update specific transaction cache
          queryClient.setQueryData(['transactions', transaction.id], transaction)

          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          if (showNotifications) {
            toast.info(`Transaction updated: ${transaction.description}`)
          }

          onUpdate?.(transaction)
          break
        }

        case 'transaction:deleted': {
          const event = data as RealTimeEvent<{ id: string }>
          const transactionId = event.data.id

          // Update React Query cache
          queryClient.setQueryData(['transactions'], (old: Transaction[] = []) => {
            return old.filter(t => t.id !== transactionId)
          })

          // Remove specific transaction cache
          queryClient.removeQueries({ queryKey: ['transactions', transactionId] })

          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          if (showNotifications) {
            toast.info('Transaction deleted')
          }

          onDelete?.(transactionId)
          break
        }

        case 'transactions:bulk_update': {
          const event = data as BulkUpdateEvent<Transaction>

          // Invalidate all transaction queries for bulk updates
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          if (showNotifications) {
            toast.info(`${event.entities.length} transactions updated`)
          }
          break
        }
      }
    }, [queryClient, showNotifications, onCreate, onUpdate, onDelete])
  })

  return { isConnected, error }
}

// Accounts Real-time Hook
export function useRealtimeAccounts(options: {
  showNotifications?: boolean
  onUpdate?: (account: Account) => void
  onBalanceUpdate?: (accountId: string, newBalance: number) => void
} = {}) {
  const { showNotifications = true, onUpdate, onBalanceUpdate } = options
  const queryClient = useQueryClient()

  const { isConnected, error } = useRealtime(['accounts'], {
    onMessage: useCallback((data: RealTimeEvent) => {
      switch (data.type) {
        case 'account:updated': {
          const event = data as EntityEvent<Account>
          const account = event.entity

          // Update React Query cache
          queryClient.setQueryData(['accounts'], (old: Account[] = []) => {
            return old.map(a => a.id === account.id ? account : a)
          })

          // Update specific account cache
          queryClient.setQueryData(['accounts', account.id], account)

          if (showNotifications) {
            toast.info(`Account updated: ${account.name}`)
          }

          onUpdate?.(account)
          break
        }

        case 'account:balance_updated': {
          const event = data as RealTimeEvent<{ accountId: string; newBalance: number; oldBalance: number }>
          const { accountId, newBalance } = event.data

          // Update React Query cache
          queryClient.setQueryData(['accounts'], (old: Account[] = []) => {
            return old.map(a =>
              a.id === accountId ? { ...a, balance: newBalance } : a
            )
          })

          // Update specific account cache
          queryClient.setQueryData(['accounts', accountId], (old: Account | undefined) => {
            return old ? { ...old, balance: newBalance } : old
          })

          // Invalidate dashboard to refresh stats
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          if (showNotifications) {
            toast.info(`Account balance updated`)
          }

          onBalanceUpdate?.(accountId, newBalance)
          break
        }

        case 'accounts:bulk_sync': {
          // Full refresh for bulk account updates
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          if (showNotifications) {
            toast.info('Accounts synchronized')
          }
          break
        }
      }
    }, [queryClient, showNotifications, onUpdate, onBalanceUpdate])
  })

  return { isConnected, error }
}

// Categories Real-time Hook
export function useRealtimeCategories(options: {
  showNotifications?: boolean
  onUpdate?: (category: Category) => void
  onCreate?: (category: Category) => void
  onDelete?: (categoryId: string) => void
} = {}) {
  const { showNotifications = true, onUpdate, onCreate, onDelete } = options
  const queryClient = useQueryClient()

  const { isConnected, error } = useRealtime(['categories'], {
    onMessage: useCallback((data: RealTimeEvent) => {
      switch (data.type) {
        case 'category:created': {
          const event = data as EntityEvent<Category>
          const category = event.entity

          // Update React Query cache
          queryClient.setQueryData(['categories'], (old: Category[] = []) => {
            const exists = old.some(c => c.id === category.id)
            return exists ? old : [...old, category]
          })

          if (showNotifications) {
            toast.success(`New category: ${category.name}`)
          }

          onCreate?.(category)
          break
        }

        case 'category:updated': {
          const event = data as EntityEvent<Category>
          const category = event.entity

          // Update React Query cache
          queryClient.setQueryData(['categories'], (old: Category[] = []) => {
            return old.map(c => c.id === category.id ? category : c)
          })

          // Update specific category cache
          queryClient.setQueryData(['categories', category.id], category)

          if (showNotifications) {
            toast.info(`Category updated: ${category.name}`)
          }

          onUpdate?.(category)
          break
        }

        case 'category:deleted': {
          const event = data as RealTimeEvent<{ id: string }>
          const categoryId = event.data.id

          // Update React Query cache
          queryClient.setQueryData(['categories'], (old: Category[] = []) => {
            return old.filter(c => c.id !== categoryId)
          })

          // Remove specific category cache
          queryClient.removeQueries({ queryKey: ['categories', categoryId] })

          if (showNotifications) {
            toast.info('Category deleted')
          }

          onDelete?.(categoryId)
          break
        }
      }
    }, [queryClient, showNotifications, onCreate, onUpdate, onDelete])
  })

  return { isConnected, error }
}

// Cards Real-time Hook
export function useRealtimeCards(options: {
  showNotifications?: boolean
  onUpdate?: (card: Card) => void
  onCreate?: (card: Card) => void
  onDelete?: (cardId: string) => void
} = {}) {
  const { showNotifications = true, onUpdate, onCreate, onDelete } = options
  const queryClient = useQueryClient()

  const { isConnected, error } = useRealtime(['cards'], {
    onMessage: useCallback((data: RealTimeEvent) => {
      switch (data.type) {
        case 'card:created': {
          const event = data as EntityEvent<Card>
          const card = event.entity

          // Update React Query cache
          queryClient.setQueryData(['cards'], (old: Card[] = []) => {
            const exists = old.some(c => c.id === card.id)
            return exists ? old : [...old, card]
          })

          if (showNotifications) {
            toast.success(`New card added: ${card.last_four ? `****${card.last_four}` : card.name}`)
          }

          onCreate?.(card)
          break
        }

        case 'card:updated': {
          const event = data as EntityEvent<Card>
          const card = event.entity

          // Update React Query cache
          queryClient.setQueryData(['cards'], (old: Card[] = []) => {
            return old.map(c => c.id === card.id ? card : c)
          })

          // Update specific card cache
          queryClient.setQueryData(['cards', card.id], card)

          if (showNotifications) {
            toast.info(`Card updated: ${card.last_four ? `****${card.last_four}` : card.name}`)
          }

          onUpdate?.(card)
          break
        }

        case 'card:deleted': {
          const event = data as RealTimeEvent<{ id: string }>
          const cardId = event.data.id

          // Update React Query cache
          queryClient.setQueryData(['cards'], (old: Card[] = []) => {
            return old.filter(c => c.id !== cardId)
          })

          // Remove specific card cache
          queryClient.removeQueries({ queryKey: ['cards', cardId] })

          if (showNotifications) {
            toast.info('Card deleted')
          }

          onDelete?.(cardId)
          break
        }
      }
    }, [queryClient, showNotifications, onCreate, onUpdate, onDelete])
  })

  return { isConnected, error }
}

// Dashboard Real-time Hook
export function useRealtimeDashboard(options: {
  showNotifications?: boolean
} = {}) {
  const { showNotifications = true } = options
  const queryClient = useQueryClient()

  const { isConnected, error } = useRealtime(['dashboard'], {
    onMessage: useCallback((data: RealTimeEvent) => {
      switch (data.type) {
        case 'dashboard:stats_updated': {
          // Refresh dashboard stats
          queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] })

          if (showNotifications) {
            toast.info('Dashboard stats updated')
          }
          break
        }

        case 'dashboard:refresh': {
          // Full dashboard refresh
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
          queryClient.invalidateQueries({ queryKey: ['transactions'] })
          queryClient.invalidateQueries({ queryKey: ['accounts'] })

          if (showNotifications) {
            toast.info('Dashboard refreshed')
          }
          break
        }
      }
    }, [queryClient, showNotifications])
  })

  return { isConnected, error }
}

// Combined hook for all entity updates
export function useRealtimeAll(options: {
  showNotifications?: boolean
} = {}) {
  const { showNotifications = true } = options

  const transactions = useRealtimeTransactions({ showNotifications })
  const accounts = useRealtimeAccounts({ showNotifications })
  const categories = useRealtimeCategories({ showNotifications })
  const cards = useRealtimeCards({ showNotifications })
  const dashboard = useRealtimeDashboard({ showNotifications })

  const isConnected = transactions.isConnected &&
                     accounts.isConnected &&
                     categories.isConnected &&
                     cards.isConnected &&
                     dashboard.isConnected

  const hasError = !!(transactions.error ||
                     accounts.error ||
                     categories.error ||
                     cards.error ||
                     dashboard.error)

  return {
    isConnected,
    hasError,
    transactions,
    accounts,
    categories,
    cards,
    dashboard
  }
}