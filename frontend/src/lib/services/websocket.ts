import { io, Socket } from 'socket.io-client'

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
  id?: string
}

export interface ConnectionStatus {
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  error: string | null
  reconnectAttempts: number
  lastConnected: Date | null
}

export type ConnectionEventType = 'connect' | 'disconnect' | 'reconnect' | 'error' | 'message'

export interface WebSocketEventHandler {
  (data: any): void
}

export interface WebSocketEventHandlers {
  [event: string]: WebSocketEventHandler[]
}

class WebSocketService {
  private socket: Socket | null = null
  private eventHandlers: WebSocketEventHandlers = {}
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    error: null,
    reconnectAttempts: 0,
    lastConnected: null,
  }
  private statusListeners: Array<(status: ConnectionStatus) => void> = []
  private reconnectTimeout: NodeJS.Timeout | null = null
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private authToken: string | null = null

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))

      // Listen for tab visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }

  connect(token: string, options: {
    serverUrl?: string
    namespace?: string
    autoReconnect?: boolean
  } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const {
        serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000',
        namespace = '',
        autoReconnect = true
      } = options

      this.authToken = token
      this.updateStatus({ isConnecting: true, error: null })

      try {
        this.socket = io(`${serverUrl}${namespace}`, {
          auth: {
            token: token
          },
          autoConnect: false,
          reconnection: autoReconnect,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: this.maxReconnectDelay,
          timeout: 20000,
          transports: ['websocket', 'polling']
        })

        this.setupSocketEventListeners(resolve, reject)
        this.socket.connect()

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
        this.updateStatus({
          isConnecting: false,
          error: errorMessage
        })
        reject(error)
      }
    })
  }

  private setupSocketEventListeners(
    resolve: () => void,
    reject: (error: any) => void
  ): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      this.updateStatus({
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        error: null,
        reconnectAttempts: 0,
        lastConnected: new Date()
      })
      this.startHeartbeat()
      resolve()
    })

    this.socket.on('disconnect', (reason) => {
      this.updateStatus({
        isConnected: false,
        error: reason === 'io server disconnect' ? 'Server disconnected' : null
      })
      this.stopHeartbeat()
      this.emit('disconnect', { reason })
    })

    this.socket.on('connect_error', (error) => {
      const errorMessage = error.message || 'Connection failed'
      this.updateStatus({
        isConnected: false,
        isConnecting: false,
        error: errorMessage
      })
      reject(error)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      this.updateStatus({
        isConnected: true,
        isReconnecting: false,
        error: null,
        reconnectAttempts: attemptNumber,
        lastConnected: new Date()
      })
      this.emit('reconnect', { attemptNumber })
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.updateStatus({
        isReconnecting: true,
        reconnectAttempts: attemptNumber
      })
    })

    this.socket.on('reconnect_error', (error) => {
      this.updateStatus({
        error: error.message || 'Reconnection failed'
      })
    })

    this.socket.on('reconnect_failed', () => {
      this.updateStatus({
        isReconnecting: false,
        error: 'Failed to reconnect after maximum attempts'
      })
    })

    // Data events
    this.socket.onAny((eventName, data) => {
      // Handle all incoming events
      this.emit(eventName, data)
    })

    // Authentication events
    this.socket.on('auth_error', (error) => {
      this.updateStatus({
        error: `Authentication failed: ${error.message}`
      })
      this.disconnect()
    })

    // Server events
    this.socket.on('server_message', (message) => {
      this.emit('message', message)
    })
  }

  disconnect(): void {
    this.stopHeartbeat()

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.updateStatus({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      error: null,
      reconnectAttempts: 0
    })
  }

  send(event: string, data: any): boolean {
    if (!this.socket?.connected) {
      console.warn('Cannot send message: socket not connected')
      return false
    }

    try {
      this.socket.emit(event, data)
      return true
    } catch (error) {
      console.error('Failed to send message:', error)
      return false
    }
  }

  on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = []
    }
    this.eventHandlers[event].push(handler)

    // Return unsubscribe function
    return () => {
      this.off(event, handler)
    }
  }

  off(event: string, handler?: WebSocketEventHandler): void {
    if (!this.eventHandlers[event]) return

    if (handler) {
      const index = this.eventHandlers[event].indexOf(handler)
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1)
      }
    } else {
      // Remove all handlers for this event
      this.eventHandlers[event] = []
    }
  }

  private emit(event: string, data: any): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(listener)

    // Send current status immediately
    listener(this.connectionStatus)

    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(listener)
      if (index > -1) {
        this.statusListeners.splice(index, 1)
      }
    }
  }

  private updateStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates }
    this.statusListeners.forEach(listener => {
      try {
        listener(this.connectionStatus)
      } catch (error) {
        console.error('Error in status listener:', error)
      }
    })
  }

  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus }
  }

  isConnected(): boolean {
    return this.connectionStatus.isConnected
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', { timestamp: Date.now() })
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleOnline(): void {
    if (!this.connectionStatus.isConnected && this.authToken) {
      // Network back online, attempting to reconnect
      this.connect(this.authToken)
    }
  }

  private handleOffline(): void {
    this.updateStatus({
      error: 'Network connection lost'
    })
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && !this.connectionStatus.isConnected && this.authToken) {
      // Tab became visible and we're disconnected, try to reconnect
      // Tab visible and disconnected, attempting to reconnect
      this.connect(this.authToken)
    }
  }

  // Utility methods for common operations
  subscribe(channels: string[]): void {
    if (!this.socket?.connected) return

    this.socket.emit('subscribe', { channels })
  }

  unsubscribe(channels: string[]): void {
    if (!this.socket?.connected) return

    this.socket.emit('unsubscribe', { channels })
  }

  // Clean up resources
  destroy(): void {
    this.disconnect()
    this.eventHandlers = {}
    this.statusListeners = []

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this))
      window.removeEventListener('offline', this.handleOffline.bind(this))
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
    }
  }
}

// Singleton instance
export const webSocketService = new WebSocketService()

export default webSocketService