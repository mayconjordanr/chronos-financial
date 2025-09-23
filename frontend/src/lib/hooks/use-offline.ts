'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { webSocketService } from '@/lib/services/websocket'

export interface OfflineOperation {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'transaction' | 'account' | 'card' | 'category'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
}

export interface OfflineState {
  isOnline: boolean
  pendingOperations: OfflineOperation[]
  isSyncing: boolean
  lastSyncAttempt: Date | null
  syncErrors: string[]
}

const MAX_RETRIES = 3
const SYNC_RETRY_DELAY = 2000
const STORAGE_KEY = 'chronos_offline_operations'

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingOperations: [],
    isSyncing: false,
    lastSyncAttempt: null,
    syncErrors: []
  })

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const toastIdRef = useRef<string | null>(null)

  // Load pending operations from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const operations = JSON.parse(stored) as OfflineOperation[]
        setState(prev => ({ ...prev, pendingOperations: operations }))
      }
    } catch (error) {
      console.error('Failed to load offline operations:', error)
    }
  }, [])

  // Save pending operations to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.pendingOperations))
    } catch (error) {
      console.error('Failed to save offline operations:', error)
    }
  }, [state.pendingOperations])

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, syncErrors: [] }))
      
      // Dismiss offline toast if it exists
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current)
        toastIdRef.current = null
      }

      // Show back online toast
      toast.success('Back online! Syncing pending changes...', {
        duration: 3000
      })

      // Attempt to sync pending operations
      syncPendingOperations()
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
      
      // Show offline toast
      toastIdRef.current = toast.error('You\'re offline. Changes will be saved and synced when connection is restored.', {
        duration: Infinity,
        action: {
          label: 'Dismiss',
          onClick: () => {
            if (toastIdRef.current) {
              toast.dismiss(toastIdRef.current)
              toastIdRef.current = null
            }
          }
        }
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for WebSocket connection status
  useEffect(() => {
    const unsubscribe = webSocketService.onStatusChange((status) => {
      if (status.isConnected && state.pendingOperations.length > 0) {
        // WebSocket reconnected, try to sync
        syncPendingOperations()
      }
    })

    return unsubscribe
  }, [state.pendingOperations.length])

  // Add operation to queue
  const queueOperation = useCallback((operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount' | 'maxRetries'>) => {
    const newOperation: OfflineOperation = {
      ...operation,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES
    }

    setState(prev => ({
      ...prev,
      pendingOperations: [...prev.pendingOperations, newOperation]
    }))

    // Show queued toast if offline
    if (!state.isOnline) {
      toast.info(`${operation.type.toLowerCase()} ${operation.entity} queued for sync`, {
        duration: 2000
      })
    }

    return newOperation.id
  }, [state.isOnline])

  // Remove operation from queue
  const removeOperation = useCallback((operationId: string) => {
    setState(prev => ({
      ...prev,
      pendingOperations: prev.pendingOperations.filter(op => op.id !== operationId)
    }))
  }, [])

  // Retry failed operation
  const retryOperation = useCallback((operationId: string) => {
    setState(prev => ({
      ...prev,
      pendingOperations: prev.pendingOperations.map(op => 
        op.id === operationId
          ? { ...op, retryCount: op.retryCount + 1 }
          : op
      )
    }))
  }, [])

  // Sync pending operations
  const syncPendingOperations = useCallback(async () => {
    if (state.isSyncing || state.pendingOperations.length === 0 || !state.isOnline) {
      return
    }

    setState(prev => ({ ...prev, isSyncing: true, lastSyncAttempt: new Date() }))

    const errors: string[] = []
    const operationsToSync = [...state.pendingOperations]

    for (const operation of operationsToSync) {
      try {
        // Simulate API call - in real implementation, this would call actual API endpoints
        await simulateApiCall(operation)
        
        // Remove successful operation
        removeOperation(operation.id)
        
        toast.success(`${operation.entity} ${operation.type.toLowerCase()}d successfully`, {
          duration: 2000
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        if (operation.retryCount < operation.maxRetries) {
          // Retry operation
          retryOperation(operation.id)
          
          // Schedule retry
          setTimeout(() => {
            syncPendingOperations()
          }, SYNC_RETRY_DELAY * (operation.retryCount + 1))
        } else {
          // Max retries reached, remove operation and add to errors
          removeOperation(operation.id)
          errors.push(`Failed to sync ${operation.entity} ${operation.type}: ${errorMessage}`)
          
          toast.error(`Failed to sync ${operation.entity} after ${operation.maxRetries} attempts`, {
            duration: 5000
          })
        }
      }
    }

    setState(prev => ({
      ...prev,
      isSyncing: false,
      syncErrors: errors
    }))

    if (errors.length === 0 && operationsToSync.length > 0) {
      toast.success('All pending changes synced successfully!', {
        duration: 3000
      })
    }
  }, [state.isSyncing, state.pendingOperations, state.isOnline, removeOperation, retryOperation])

  // Force sync (manual trigger)
  const forceSync = useCallback(() => {
    if (!state.isOnline) {
      toast.error('Cannot sync while offline')
      return
    }

    syncPendingOperations()
  }, [state.isOnline, syncPendingOperations])

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    setState(prev => ({ ...prev, pendingOperations: [], syncErrors: [] }))
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    
    toast.success('Pending operations cleared')
  }, [])

  // Get operations by entity
  const getOperationsByEntity = useCallback((entity: OfflineOperation['entity']) => {
    return state.pendingOperations.filter(op => op.entity === entity)
  }, [state.pendingOperations])

  // Check if entity has pending operations
  const hasPendingOperations = useCallback((entity?: OfflineOperation['entity']) => {
    if (entity) {
      return state.pendingOperations.some(op => op.entity === entity)
    }
    return state.pendingOperations.length > 0
  }, [state.pendingOperations])

  return {
    // State
    isOnline: state.isOnline,
    pendingOperations: state.pendingOperations,
    isSyncing: state.isSyncing,
    lastSyncAttempt: state.lastSyncAttempt,
    syncErrors: state.syncErrors,
    
    // Actions
    queueOperation,
    removeOperation,
    retryOperation,
    syncPendingOperations,
    forceSync,
    clearPendingOperations,
    
    // Utilities
    getOperationsByEntity,
    hasPendingOperations,
    pendingCount: state.pendingOperations.length
  }
}

// Simulate API call for testing
async function simulateApiCall(operation: OfflineOperation): Promise<any> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  
  // Simulate occasional failures for testing
  if (Math.random() < 0.1) {
    throw new Error('Simulated network error')
  }
  
  return {
    id: operation.id,
    success: true,
    data: operation.data
  }
}

// Hook for offline-aware mutations
export function useOfflineMutation<T = any>(
  entity: OfflineOperation['entity'],
  mutationFn: (data: T) => Promise<any>,
  options: {
    onSuccess?: (data: any) => void
    onError?: (error: any) => void
    optimisticUpdate?: (data: T) => void
  } = {}
) {
  const { isOnline, queueOperation } = useOffline()
  const { onSuccess, onError, optimisticUpdate } = options

  const mutate = useCallback(async (data: T, operationType: OfflineOperation['type'] = 'CREATE') => {
    // Apply optimistic update immediately
    if (optimisticUpdate) {
      optimisticUpdate(data)
    }

    if (isOnline) {
      try {
        const result = await mutationFn(data)
        if (onSuccess) {
          onSuccess(result)
        }
        return result
      } catch (error) {
        // If online but request fails, queue for later
        queueOperation({
          type: operationType,
          entity,
          data
        })
        
        if (onError) {
          onError(error)
        }
        throw error
      }
    } else {
      // Offline - queue operation
      const operationId = queueOperation({
        type: operationType,
        entity,
        data
      })
      
      return { id: operationId, queued: true }
    }
  }, [isOnline, entity, mutationFn, queueOperation, onSuccess, onError, optimisticUpdate])

  return {
    mutate,
    isOnline
  }
}