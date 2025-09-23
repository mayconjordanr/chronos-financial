import { useCallback, useRef } from 'react'
import { useMutation, useQueryClient, MutationFunction } from '@tanstack/react-query'
import { useRealTimeContext } from '@/lib/providers/realtime-provider'
import { Account, Transaction, Category, Card } from '@/types/api'
import { toast } from 'sonner'

// Types for optimistic updates
interface OptimisticUpdate<T> {
  id: string
  type: 'create' | 'update' | 'delete'
  data: T
  queryKey: (string | number)[]
  timestamp: number
  retryCount: number
}

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: MutationFunction<TData, TVariables>
  queryKey: (string | number)[]
  updateFn: (oldData: any, variables: TVariables, optimisticId: string) => any
  rollbackFn?: (oldData: any, variables: TVariables, optimisticId: string) => any
  successMessage?: string
  errorMessage?: string
  showToasts?: boolean
  retryCount?: number
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
  onOptimisticUpdate?: (variables: TVariables, optimisticId: string) => void
  onRollback?: (variables: TVariables, optimisticId: string) => void
}

// Generate unique optimistic ID
function generateOptimisticId(): string {
  return `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generic optimistic mutation hook
export function useOptimisticMutation<TData = unknown, TVariables = unknown>(
  options: OptimisticMutationOptions<TData, TVariables>
) {
  const {
    mutationFn,
    queryKey,
    updateFn,
    rollbackFn,
    successMessage,
    errorMessage,
    showToasts = true,
    retryCount = 3,
    onSuccess,
    onError,
    onOptimisticUpdate,
    onRollback
  } = options

  const queryClient = useQueryClient()
  const { broadcastToTabs } = useRealTimeContext()
  const optimisticUpdatesRef = useRef<Map<string, OptimisticUpdate<any>>>(new Map())

  const mutation = useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      const optimisticId = generateOptimisticId()

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey)

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: any) => updateFn(old, variables, optimisticId))

      // Store optimistic update for potential rollback
      optimisticUpdatesRef.current.set(optimisticId, {
        id: optimisticId,
        type: 'update', // This will be determined by the specific hook
        data: variables,
        queryKey,
        timestamp: Date.now(),
        retryCount: 0
      })

      // Broadcast optimistic update to other tabs
      broadcastToTabs({
        type: 'optimistic_update',
        optimisticId,
        queryKey,
        variables,
        timestamp: Date.now()
      })

      // Show optimistic feedback
      if (showToasts) {
        toast.loading('Updating...', { id: optimisticId })
      }

      onOptimisticUpdate?.(variables, optimisticId)

      // Return context with previous data and optimistic ID
      return { previousData, optimisticId }
    },
    onError: (error: Error, variables: TVariables, context) => {
      const { previousData, optimisticId } = context || {}

      if (optimisticId && previousData !== undefined) {
        // Rollback optimistic update
        if (rollbackFn) {
          queryClient.setQueryData(queryKey, (old: any) => rollbackFn(old, variables, optimisticId))
        } else {
          queryClient.setQueryData(queryKey, previousData)
        }

        // Remove optimistic update record
        optimisticUpdatesRef.current.delete(optimisticId)

        // Broadcast rollback to other tabs
        broadcastToTabs({
          type: 'optimistic_rollback',
          optimisticId,
          queryKey,
          previousData,
          timestamp: Date.now()
        })

        // Update toast
        if (showToasts) {
          toast.error(errorMessage || 'Operation failed', { id: optimisticId })
        }

        onRollback?.(variables, optimisticId)
      }

      onError?.(error, variables)
    },
    onSuccess: (data: TData, variables: TVariables, context) => {
      const { optimisticId } = context || {}

      if (optimisticId) {
        // Remove optimistic update record
        optimisticUpdatesRef.current.delete(optimisticId)

        // Broadcast success to other tabs
        broadcastToTabs({
          type: 'optimistic_success',
          optimisticId,
          queryKey,
          data,
          timestamp: Date.now()
        })

        // Update toast
        if (showToasts) {
          toast.success(successMessage || 'Operation completed', { id: optimisticId })
        }
      }

      onSuccess?.(data, variables)
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey })
    },
    retry: retryCount
  })

  // Get pending optimistic updates
  const getPendingUpdates = useCallback(() => {
    return Array.from(optimisticUpdatesRef.current.values())
  }, [])

  // Clear all optimistic updates (useful for cleanup)
  const clearOptimisticUpdates = useCallback(() => {
    optimisticUpdatesRef.current.clear()
  }, [])

  return {
    ...mutation,
    getPendingUpdates,
    clearOptimisticUpdates,
    isOptimistic: optimisticUpdatesRef.current.size > 0
  }
}

// Optimistic Transaction Hooks
export function useOptimisticCreateTransaction() {
  return useOptimisticMutation<Transaction, Partial<Transaction>>({
    mutationFn: async (data) => {
      // This would be replaced with actual API call
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['transactions'],
    updateFn: (old: Transaction[] = [], variables, optimisticId) => {
      const optimisticTransaction: Transaction = {
        id: optimisticId,
        ...variables,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: variables.user_id || '',
        tenant_id: variables.tenant_id || '',
        // Add other required fields with defaults
      } as Transaction

      return [optimisticTransaction, ...old]
    },
    successMessage: 'Transaction created successfully',
    errorMessage: 'Failed to create transaction',
    onOptimisticUpdate: (variables, optimisticId) => {
      // Transaction optimistically created
    }
  })
}

export function useOptimisticUpdateTransaction() {
  return useOptimisticMutation<Transaction, { id: string; data: Partial<Transaction> }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['transactions'],
    updateFn: (old: Transaction[] = [], { id, data }, optimisticId) => {
      return old.map(transaction =>
        transaction.id === id
          ? { ...transaction, ...data, updated_at: new Date().toISOString() }
          : transaction
      )
    },
    successMessage: 'Transaction updated successfully',
    errorMessage: 'Failed to update transaction'
  })
}

export function useOptimisticDeleteTransaction() {
  return useOptimisticMutation<void, string>({
    mutationFn: async (id) => {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    },
    queryKey: ['transactions'],
    updateFn: (old: Transaction[] = [], id, optimisticId) => {
      return old.filter(transaction => transaction.id !== id)
    },
    rollbackFn: (old: Transaction[], id, optimisticId) => {
      // For deletes, we need to restore the deleted item
      // This is complex and might require storing the deleted item
      return old
    },
    successMessage: 'Transaction deleted successfully',
    errorMessage: 'Failed to delete transaction'
  })
}

// Optimistic Account Hooks
export function useOptimisticCreateAccount() {
  return useOptimisticMutation<Account, Partial<Account>>({
    mutationFn: async (data) => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['accounts'],
    updateFn: (old: Account[] = [], variables, optimisticId) => {
      const optimisticAccount: Account = {
        id: optimisticId,
        ...variables,
        balance: variables.balance || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: variables.user_id || '',
        tenant_id: variables.tenant_id || '',
      } as Account

      return [...old, optimisticAccount]
    },
    successMessage: 'Account created successfully',
    errorMessage: 'Failed to create account'
  })
}

export function useOptimisticUpdateAccount() {
  return useOptimisticMutation<Account, { id: string; data: Partial<Account> }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['accounts'],
    updateFn: (old: Account[] = [], { id, data }, optimisticId) => {
      return old.map(account =>
        account.id === id
          ? { ...account, ...data, updated_at: new Date().toISOString() }
          : account
      )
    },
    successMessage: 'Account updated successfully',
    errorMessage: 'Failed to update account'
  })
}

// Optimistic Category Hooks
export function useOptimisticCreateCategory() {
  return useOptimisticMutation<Category, Partial<Category>>({
    mutationFn: async (data) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['categories'],
    updateFn: (old: Category[] = [], variables, optimisticId) => {
      const optimisticCategory: Category = {
        id: optimisticId,
        ...variables,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: variables.user_id || '',
        tenant_id: variables.tenant_id || '',
      } as Category

      return [...old, optimisticCategory]
    },
    successMessage: 'Category created successfully',
    errorMessage: 'Failed to create category'
  })
}

export function useOptimisticUpdateCategory() {
  return useOptimisticMutation<Category, { id: string; data: Partial<Category> }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['categories'],
    updateFn: (old: Category[] = [], { id, data }, optimisticId) => {
      return old.map(category =>
        category.id === id
          ? { ...category, ...data, updated_at: new Date().toISOString() }
          : category
      )
    },
    successMessage: 'Category updated successfully',
    errorMessage: 'Failed to update category'
  })
}

// Optimistic Card Hooks
export function useOptimisticCreateCard() {
  return useOptimisticMutation<Card, Partial<Card>>({
    mutationFn: async (data) => {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['cards'],
    updateFn: (old: Card[] = [], variables, optimisticId) => {
      const optimisticCard: Card = {
        id: optimisticId,
        ...variables,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: variables.user_id || '',
        tenant_id: variables.tenant_id || '',
      } as Card

      return [...old, optimisticCard]
    },
    successMessage: 'Card added successfully',
    errorMessage: 'Failed to add card'
  })
}

export function useOptimisticUpdateCard() {
  return useOptimisticMutation<Card, { id: string; data: Partial<Card> }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return response.json()
    },
    queryKey: ['cards'],
    updateFn: (old: Card[] = [], { id, data }, optimisticId) => {
      return old.map(card =>
        card.id === id
          ? { ...card, ...data, updated_at: new Date().toISOString() }
          : card
      )
    },
    successMessage: 'Card updated successfully',
    errorMessage: 'Failed to update card'
  })
}

// Multi-entity optimistic operations
export function useOptimisticBulkUpdate<T>(entityType: 'transactions' | 'accounts' | 'categories' | 'cards') {
  return useOptimisticMutation<T[], { ids: string[]; data: Partial<T> }>({
    mutationFn: async ({ ids, data }) => {
      const response = await fetch(`/api/${entityType}/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, data })
      })
      return response.json()
    },
    queryKey: [entityType],
    updateFn: (old: T[] = [], { ids, data }, optimisticId) => {
      return old.map((item: any) =>
        ids.includes(item.id)
          ? { ...item, ...data, updated_at: new Date().toISOString() }
          : item
      )
    },
    successMessage: `${entityType} updated successfully`,
    errorMessage: `Failed to update ${entityType}`
  })
}