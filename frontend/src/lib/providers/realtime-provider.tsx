'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { webSocketService, ConnectionStatus } from '@/lib/services/websocket'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'

interface RealTimeContextType {
  // Connection status
  connectionStatus: ConnectionStatus
  isConnected: boolean

  // Connection control
  connect: () => Promise<void>
  disconnect: () => void

  // Event subscription
  subscribe: (event: string, handler: (data: any) => void) => () => void
  unsubscribe: (event: string, handler?: (data: any) => void) => void

  // Send messages
  send: (event: string, data: any) => boolean

  // Channel subscription for real-time updates
  subscribeToChannels: (channels: string[]) => void
  unsubscribeFromChannels: (channels: string[]) => void

  // Multi-tab sync
  broadcastToTabs: (data: any) => void
  onTabMessage: (handler: (data: any) => void) => () => void

  // Sync state
  lastSyncTime: Date | null
  isSyncing: boolean

  // Error handling
  lastError: string | null
  clearError: () => void
}

const RealTimeContext = createContext<RealTimeContextType | null>(null)

interface RealTimeProviderProps {
  children: React.ReactNode
  autoConnect?: boolean
  showConnectionToasts?: boolean
}

export function RealTimeProvider({
  children,
  autoConnect = true,
  showConnectionToasts = true
}: RealTimeProviderProps) {
  const { user, token, isAuthenticated } = useAuthStore()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(webSocketService.getStatus())
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [subscribedChannels, setSubscribedChannels] = useState<Set<string>>(new Set())

  // Multi-tab communication
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const tabMessageHandlers = useRef<Array<(data: any) => void>>([])

  // Connection control
  const connect = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setLastError('No authentication token available')
      return
    }

    try {
      await webSocketService.connect(token)
      setLastError(null)

      if (showConnectionToasts) {
        toast.success('Connected to real-time updates')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed'
      setLastError(errorMessage)

      if (showConnectionToasts) {
        toast.error(`Connection failed: ${errorMessage}`)
      }
    }
  }, [token, isAuthenticated, showConnectionToasts])

  const disconnect = useCallback(() => {
    webSocketService.disconnect()
    setLastError(null)

    if (showConnectionToasts) {
      toast.info('Disconnected from real-time updates')
    }
  }, [showConnectionToasts])

  // Event subscription
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    return webSocketService.on(event, handler)
  }, [])

  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    webSocketService.off(event, handler)
  }, [])

  // Send messages
  const send = useCallback((event: string, data: any) => {
    return webSocketService.send(event, data)
  }, [])

  // Channel subscription
  const subscribeToChannels = useCallback((channels: string[]) => {
    if (webSocketService.isConnected()) {
      webSocketService.subscribe(channels)
      setSubscribedChannels(prev => {
        const newSet = new Set(prev)
        channels.forEach(channel => newSet.add(channel))
        return newSet
      })
    }
  }, [])

  const unsubscribeFromChannels = useCallback((channels: string[]) => {
    if (webSocketService.isConnected()) {
      webSocketService.unsubscribe(channels)
      setSubscribedChannels(prev => {
        const newSet = new Set(prev)
        channels.forEach(channel => newSet.delete(channel))
        return newSet
      })
    }
  }, [])

  // Multi-tab communication
  const broadcastToTabs = useCallback((data: any) => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'realtime_sync',
        data,
        timestamp: Date.now(),
        tabId: window.name || 'unknown'
      })
    }
  }, [])

  const onTabMessage = useCallback((handler: (data: any) => void) => {
    tabMessageHandlers.current.push(handler)

    return () => {
      const index = tabMessageHandlers.current.indexOf(handler)
      if (index > -1) {
        tabMessageHandlers.current.splice(index, 1)
      }
    }
  }, [])

  // Error handling
  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

  // Set up WebSocket status listener
  useEffect(() => {
    const unsubscribeStatus = webSocketService.onStatusChange((status) => {
      setConnectionStatus(status)

      if (status.error) {
        setLastError(status.error)
      }

      if (status.isConnected && status.lastConnected) {
        setLastSyncTime(status.lastConnected)
      }
    })

    return unsubscribeStatus
  }, [])

  // Set up multi-tab communication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const channel = new BroadcastChannel('chronos-realtime')
      broadcastChannelRef.current = channel

      channel.addEventListener('message', (event) => {
        tabMessageHandlers.current.forEach(handler => {
          try {
            handler(event.data)
          } catch (error) {
            console.error('Error in tab message handler:', error)
          }
        })
      })

      return () => {
        channel.close()
        broadcastChannelRef.current = null
      }
    }
  }, [])

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && token && !connectionStatus.isConnected && !connectionStatus.isConnecting) {
      connect()
    }
  }, [autoConnect, isAuthenticated, token, connectionStatus.isConnected, connectionStatus.isConnecting, connect])

  // Re-subscribe to channels when connection is established
  useEffect(() => {
    if (connectionStatus.isConnected && subscribedChannels.size > 0) {
      webSocketService.subscribe(Array.from(subscribedChannels))
    }
  }, [connectionStatus.isConnected, subscribedChannels])

  // Handle sync events
  useEffect(() => {
    const unsubscribeSyncStart = subscribe('sync:start', (data) => {
      setIsSyncing(true)
    })

    const unsubscribeSyncComplete = subscribe('sync:complete', (data) => {
      setIsSyncing(false)
      setLastSyncTime(new Date())
    })

    const unsubscribeSyncError = subscribe('sync:error', (data) => {
      setIsSyncing(false)
      setLastError(data.error || 'Sync error occurred')

      if (showConnectionToasts) {
        toast.error(`Sync error: ${data.error}`)
      }
    })

    return () => {
      unsubscribeSyncStart()
      unsubscribeSyncComplete()
      unsubscribeSyncError()
    }
  }, [subscribe, showConnectionToasts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webSocketService.destroy()
    }
  }, [])

  const contextValue: RealTimeContextType = {
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
    subscribeToChannels,
    unsubscribeFromChannels,
    broadcastToTabs,
    onTabMessage,
    lastSyncTime,
    isSyncing,
    lastError,
    clearError,
  }

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  )
}

export function useRealTimeContext(): RealTimeContextType {
  const context = useContext(RealTimeContext)
  if (!context) {
    throw new Error('useRealTimeContext must be used within a RealTimeProvider')
  }
  return context
}

export { RealTimeContext }