'use client'

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Upload
} from "lucide-react"
import { useRealtime } from "@/lib/hooks/use-realtime"
import { useRealTimeContext } from "@/lib/providers/realtime-provider"
import { useOffline } from "@/lib/hooks/use-offline"

type SyncStatus = 'connected' | 'disconnected' | 'syncing' | 'error' | 'offline' | 'pending'

interface SyncIndicatorProps {
  status?: SyncStatus
  lastSync?: Date
  onRetry?: () => void
}

export function SyncIndicator({
  status,
  lastSync,
  onRetry
}: SyncIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Get real-time connection status
  const {
    isConnected,
    connect,
    disconnect
  } = useRealTimeContext()

  const { isReconnecting, error: connectionError, reconnectAttempts } = useRealtime([])

  // Get offline status and pending operations
  const {
    isOnline,
    pendingOperations,
    isSyncing,
    lastSyncAttempt,
    syncErrors,
    forceSync,
    clearPendingOperations,
    pendingCount
  } = useOffline()

  // Determine current status based on real-time and offline states
  const currentStatus = status || (() => {
    if (!isOnline) return 'offline'
    if (isSyncing) return 'syncing'
    if (pendingCount > 0) return 'pending'
    if (connectionError) return 'error'
    if (isReconnecting) return 'syncing'
    if (isConnected) return 'connected'
    return 'disconnected'
  })()

  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          color: 'bg-green-500',
          variant: 'default' as const,
          description: 'Real-time sync active'
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Disconnected',
          color: 'bg-gray-500',
          variant: 'secondary' as const,
          description: 'Real-time sync offline'
        }
      case 'syncing':
        return {
          icon: RefreshCw,
          label: isSyncing ? 'Syncing...' : 'Connecting...',
          color: 'bg-blue-500',
          variant: 'default' as const,
          description: isSyncing ? 'Uploading pending changes' : 'Establishing connection'
        }
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Sync Error',
          color: 'bg-red-500',
          variant: 'destructive' as const,
          description: connectionError || 'Connection failed'
        }
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          color: 'bg-orange-500',
          variant: 'secondary' as const,
          description: 'Changes will sync when online'
        }
      case 'pending':
        return {
          icon: Clock,
          label: `${pendingCount} pending`,
          color: 'bg-yellow-500',
          variant: 'secondary' as const,
          description: 'Changes queued for sync'
        }
    }
  }

  const config = getStatusConfig(currentStatus)
  const Icon = config.icon

  // Use the most recent sync time available
  const displayLastSync = lastSync || lastSyncAttempt

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else if (currentStatus === 'error' || currentStatus === 'disconnected') {
      connect()
    } else if (currentStatus === 'pending' || currentStatus === 'offline') {
      forceSync()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <Badge
          variant={config.variant}
          className="cursor-pointer flex items-center gap-1 py-1 px-2 select-none"
          onClick={() => setShowDetails(!showDetails)}
        >
          <motion.div
            animate={currentStatus === 'syncing' ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: currentStatus === 'syncing' ? Infinity : 0 }}
          >
            <Icon className="h-3 w-3" />
          </motion.div>
          <span className="text-xs">{config.label}</span>
        </Badge>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-background border rounded-md p-3 shadow-lg min-w-[280px] max-w-[320px]"
            >
              <div className="text-xs space-y-2">
                {/* Status info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {config.description}
                  </div>
                </div>

                {/* Connection details */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Network:</span>
                    <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Real-time:</span>
                    <span className={isConnected ? 'text-green-600' : 'text-gray-600'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {/* Pending operations */}
                {pendingCount > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Pending:</span>
                      <span className="font-medium">{pendingCount} operations</span>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Operations queued for sync
                    </div>
                  </div>
                )}

                {/* Reconnection attempts */}
                {isReconnecting && reconnectAttempts > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Reconnect attempts:</span>
                    <span>{reconnectAttempts}</span>
                  </div>
                )}

                {/* Last sync time */}
                {displayLastSync && (
                  <div className="flex items-center justify-between">
                    <span>Last sync:</span>
                    <span>{displayLastSync.toLocaleTimeString()}</span>
                  </div>
                )}

                {/* Sync errors */}
                {syncErrors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-red-600 font-medium">Sync Errors:</span>
                    <div className="text-red-600 text-xs max-h-20 overflow-y-auto">
                      {syncErrors.map((error, index) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  {(currentStatus === 'error' || currentStatus === 'disconnected' || currentStatus === 'pending') && (
                    <Button
                      onClick={handleRetry}
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      disabled={false}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {currentStatus === 'pending' ? 'Sync Now' : 'Retry'}
                    </Button>
                  )}

                  {pendingCount > 0 && (
                    <Button
                      onClick={clearPendingOperations}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                    >
                      <Database className="h-3 w-3 mr-1" />
                      Clear Queue
                    </Button>
                  )}

                  {isConnected && (
                    <Button
                      onClick={disconnect}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}