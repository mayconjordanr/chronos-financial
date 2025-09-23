'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export interface TabSyncMessage {
  type: 'QUERY_INVALIDATE' | 'OPTIMISTIC_UPDATE' | 'CONNECTION_STATUS' | 'USER_ACTION' | 'TAB_FOCUS' | 'TAB_BLUR'
  payload: any
  timestamp: number
  tabId: string
  userId?: string
}

export interface TabInfo {
  id: string
  lastSeen: number
  isActive: boolean
  url: string
}

const CHANNEL_NAME = 'chronos-tabs'
const TAB_HEARTBEAT_INTERVAL = 5000
const TAB_TIMEOUT = 15000

export function useMultiTabSync() {
  const queryClient = useQueryClient()
  const channelRef = useRef<BroadcastChannel | null>(null)
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [activeTabs, setActiveTabs] = useState<Map<string, TabInfo>>(new Map())
  const [isActiveTab, setIsActiveTab] = useState(true)

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) {
      console.warn('BroadcastChannel not supported')
      return
    }

    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME)
      
      // Handle incoming messages
      channelRef.current.onmessage = (event) => {
        handleMessage(event.data)
      }

      // Announce this tab
      broadcastMessage({
        type: 'TAB_FOCUS',
        payload: {
          url: window.location.href,
          userAgent: navigator.userAgent
        },
        timestamp: Date.now(),
        tabId: tabIdRef.current
      })

      // Start heartbeat
      startHeartbeat()

      // Multi-tab sync initialized
    } catch (error) {
      console.error('Failed to initialize BroadcastChannel:', error)
    }

    return () => {
      cleanup()
    }
  }, [])

  // Handle tab visibility changes
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      setIsActiveTab(isVisible)

      if (isVisible) {
        broadcastMessage({
          type: 'TAB_FOCUS',
          payload: { url: window.location.href },
          timestamp: Date.now(),
          tabId: tabIdRef.current
        })
      } else {
        broadcastMessage({
          type: 'TAB_BLUR',
          payload: {},
          timestamp: Date.now(),
          tabId: tabIdRef.current
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    window.addEventListener('blur', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      window.removeEventListener('blur', handleVisibilityChange)
    }
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback((message: TabSyncMessage) => {
    // Ignore messages from the same tab
    if (message.tabId === tabIdRef.current) return

    try {
      switch (message.type) {
        case 'QUERY_INVALIDATE':
          handleQueryInvalidation(message.payload)
          break

        case 'OPTIMISTIC_UPDATE':
          handleOptimisticUpdate(message.payload)
          break

        case 'CONNECTION_STATUS':
          handleConnectionStatus(message.payload)
          break

        case 'USER_ACTION':
          handleUserAction(message.payload)
          break

        case 'TAB_FOCUS':
        case 'TAB_BLUR':
          updateTabInfo(message)
          break

        default:
          console.log('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Error handling tab sync message:', error)
    }
  }, [queryClient])

  // Handle query invalidation from other tabs
  const handleQueryInvalidation = useCallback((payload: { queryKeys: string[][] }) => {
    payload.queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey })
    })
  }, [queryClient])

  // Handle optimistic updates from other tabs
  const handleOptimisticUpdate = useCallback((payload: {
    queryKey: string[]
    updateFn: string
    data: any
  }) => {
    // Apply the same optimistic update to this tab's cache
    const currentData = queryClient.getQueryData(payload.queryKey)
    if (currentData) {
      // For safety, we'll just invalidate the query instead of applying the update
      // to avoid potential data corruption
      queryClient.invalidateQueries({ queryKey: payload.queryKey })
    }
  }, [queryClient])

  // Handle connection status changes
  const handleConnectionStatus = useCallback((payload: {
    isConnected: boolean
    connectionInfo: any
  }) => {
    // Show notification only if this tab is not active
    if (!isActiveTab && payload.isConnected) {
      // Don't show toast if tab is not visible to avoid spam
    }
  }, [isActiveTab])

  // Handle user actions from other tabs
  const handleUserAction = useCallback((payload: {
    action: string
    data: any
    showNotification?: boolean
  }) => {
    if (payload.showNotification && !isActiveTab) {
      toast.info(`Action performed in another tab: ${payload.action}`, {
        duration: 3000
      })
    }
  }, [isActiveTab])

  // Update tab information
  const updateTabInfo = useCallback((message: TabSyncMessage) => {
    setActiveTabs(prev => {
      const updated = new Map(prev)
      
      if (message.type === 'TAB_FOCUS') {
        updated.set(message.tabId, {
          id: message.tabId,
          lastSeen: message.timestamp,
          isActive: true,
          url: message.payload.url
        })
      } else if (message.type === 'TAB_BLUR') {
        const existing = updated.get(message.tabId)
        if (existing) {
          updated.set(message.tabId, {
            ...existing,
            isActive: false,
            lastSeen: message.timestamp
          })
        }
      }

      // Clean up old tabs
      const now = Date.now()
      for (const [tabId, info] of updated) {
        if (now - info.lastSeen > TAB_TIMEOUT) {
          updated.delete(tabId)
        }
      }

      return updated
    })
  }, [])

  // Broadcast message to other tabs
  const broadcastMessage = useCallback((message: Omit<TabSyncMessage, 'tabId'>) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          ...message,
          tabId: tabIdRef.current
        })
      } catch (error) {
        console.error('Failed to broadcast message:', error)
      }
    }
  }, [])

  // Start heartbeat to announce tab presence
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (isActiveTab) {
        broadcastMessage({
          type: 'TAB_FOCUS',
          payload: { url: window.location.href },
          timestamp: Date.now()
        })
      }
    }, TAB_HEARTBEAT_INTERVAL)
  }, [broadcastMessage, isActiveTab])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    if (channelRef.current) {
      // Announce tab closing
      try {
        channelRef.current.postMessage({
          type: 'TAB_BLUR',
          payload: {},
          timestamp: Date.now(),
          tabId: tabIdRef.current
        })
      } catch (error) {
        // Ignore errors during cleanup
      }

      channelRef.current.close()
      channelRef.current = null
    }
  }, [])

  // Public API methods
  const invalidateQueries = useCallback((queryKeys: string[][]) => {
    broadcastMessage({
      type: 'QUERY_INVALIDATE',
      payload: { queryKeys },
      timestamp: Date.now()
    })
  }, [broadcastMessage])

  const broadcastOptimisticUpdate = useCallback((queryKey: string[], updateFn: string, data: any) => {
    broadcastMessage({
      type: 'OPTIMISTIC_UPDATE',
      payload: { queryKey, updateFn, data },
      timestamp: Date.now()
    })
  }, [broadcastMessage])

  const broadcastConnectionStatus = useCallback((isConnected: boolean, connectionInfo: any) => {
    broadcastMessage({
      type: 'CONNECTION_STATUS',
      payload: { isConnected, connectionInfo },
      timestamp: Date.now()
    })
  }, [broadcastMessage])

  const broadcastUserAction = useCallback((action: string, data: any, showNotification = false) => {
    broadcastMessage({
      type: 'USER_ACTION',
      payload: { action, data, showNotification },
      timestamp: Date.now()
    })
  }, [broadcastMessage])

  // Get active tab count
  const getActiveTabCount = useCallback(() => {
    return Array.from(activeTabs.values()).filter(tab => tab.isActive).length + 1 // +1 for current tab
  }, [activeTabs])

  // Check if current tab is the only active tab
  const isOnlyActiveTab = useCallback(() => {
    return getActiveTabCount() === 1
  }, [getActiveTabCount])

  return {
    // State
    tabId: tabIdRef.current,
    activeTabs: Array.from(activeTabs.values()),
    activeTabCount: getActiveTabCount(),
    isActiveTab,
    isOnlyActiveTab: isOnlyActiveTab(),

    // Methods
    broadcastMessage,
    invalidateQueries,
    broadcastOptimisticUpdate,
    broadcastConnectionStatus,
    broadcastUserAction,
    getActiveTabCount,
    isOnlyActiveTab
  }
}

// Hook for components that need to coordinate across tabs
export function useTabCoordination() {
  const {
    activeTabCount,
    isActiveTab,
    isOnlyActiveTab,
    broadcastUserAction,
    broadcastConnectionStatus
  } = useMultiTabSync()

  // Only perform certain actions if this is the active tab
  const shouldPerformAction = useCallback((requireActive = true) => {
    return !requireActive || isActiveTab
  }, [isActiveTab])

  // Coordinate WebSocket connections (only one tab should maintain connection)
  const shouldMaintainConnection = useCallback(() => {
    return isOnlyActiveTab || isActiveTab
  }, [isOnlyActiveTab, isActiveTab])

  return {
    activeTabCount,
    isActiveTab,
    isOnlyActiveTab,
    shouldPerformAction,
    shouldMaintainConnection,
    broadcastUserAction,
    broadcastConnectionStatus
  }
}