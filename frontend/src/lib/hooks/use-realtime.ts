import { useEffect, useState, useCallback, useRef } from 'react'
import { useRealTimeContext } from '@/lib/providers/realtime-provider'

export interface UseRealtimeOptions {
  onMessage?: (data: any) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
  enabled?: boolean
  autoSubscribe?: boolean
}

export function useRealtime(channels: string | string[] = [], options: UseRealtimeOptions = {}) {
  const {
    enabled = true,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    autoSubscribe = true
  } = options

  const {
    connectionStatus,
    isConnected,
    subscribe,
    unsubscribe,
    send,
    subscribeToChannels,
    unsubscribeFromChannels,
    lastError,
  } = useRealTimeContext()

  const [subscribedChannels] = useState<string[]>(
    Array.isArray(channels) ? channels : [channels]
  )
  const handlersRef = useRef<(() => void)[]>([])

  // Handle connection status changes
  useEffect(() => {
    if (connectionStatus.isConnected && onConnect) {
      onConnect()
    } else if (!connectionStatus.isConnected && connectionStatus.lastConnected && onDisconnect) {
      onDisconnect()
    }
  }, [connectionStatus.isConnected, connectionStatus.lastConnected, onConnect, onDisconnect])

  // Handle errors
  useEffect(() => {
    if (lastError && onError) {
      onError(lastError)
    }
  }, [lastError, onError])

  // Subscribe to channels and events
  useEffect(() => {
    if (!enabled || !isConnected) return

    // Clean up previous handlers
    handlersRef.current.forEach(cleanup => cleanup())
    handlersRef.current = []

    // Subscribe to channel-specific events if channels are provided
    if (subscribedChannels.length > 0 && autoSubscribe) {
      subscribeToChannels(subscribedChannels)

      // Subscribe to events for each channel
      subscribedChannels.forEach(channel => {
        const unsubscribeHandler = subscribe(channel, (data) => {
          if (onMessage) {
            onMessage({ channel, ...data })
          }
        })
        handlersRef.current.push(unsubscribeHandler)
      })
    }

    // Subscribe to general message events
    if (onMessage) {
      const unsubscribeMessage = subscribe('message', onMessage)
      handlersRef.current.push(unsubscribeMessage)
    }

    return () => {
      // Clean up handlers
      handlersRef.current.forEach(cleanup => cleanup())
      handlersRef.current = []

      // Unsubscribe from channels
      if (subscribedChannels.length > 0 && autoSubscribe) {
        unsubscribeFromChannels(subscribedChannels)
      }
    }
  }, [
    enabled,
    isConnected,
    subscribedChannels,
    autoSubscribe,
    onMessage,
    subscribe,
    subscribeToChannels,
    unsubscribeFromChannels
  ])

  // Send message helper
  const sendMessage = useCallback((event: string, data: any) => {
    return send(event, data)
  }, [send])

  // Subscribe to additional events
  const subscribeToEvent = useCallback((event: string, handler: (data: any) => void) => {
    return subscribe(event, handler)
  }, [subscribe])

  // Unsubscribe from events
  const unsubscribeFromEvent = useCallback((event: string, handler?: (data: any) => void) => {
    unsubscribe(event, handler)
  }, [unsubscribe])

  return {
    isConnected,
    connectionStatus,
    send: sendMessage,
    subscribe: subscribeToEvent,
    unsubscribe: unsubscribeFromEvent,
    error: lastError,
    reconnectAttempts: connectionStatus.reconnectAttempts,
    isReconnecting: connectionStatus.isReconnecting,
  }
}

// Legacy support - these will be replaced by the new entity-specific hooks
export function useTransactionUpdates() {
  console.warn('useTransactionUpdates is deprecated. Use useRealtimeTransactions instead.')
  return useRealtime(['transactions'])
}

export function useAccountUpdates() {
  console.warn('useAccountUpdates is deprecated. Use useRealtimeAccounts instead.')
  return useRealtime(['accounts'])
}