'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Monitor,
  Wifi,
  WifiOff,
  Users,
  Zap,
  Database,
  RefreshCw,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react'
import { useMultiTabSync, useTabCoordination } from '@/lib/hooks/use-multi-tab-sync'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { useRealTimeContext } from '@/lib/providers/realtime-provider'
import { useOffline } from '@/lib/hooks/use-offline'
import { useOptimisticCreateTransaction } from '@/lib/hooks/use-optimistic-updates'
import { toast } from 'sonner'

interface TestOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  description: string
  timestamp: number
  status: 'pending' | 'completed' | 'failed'
}

export default function TestSyncPage() {
  const [testMessage, setTestMessage] = useState('')
  const [testOperations, setTestOperations] = useState<TestOperation[]>([])
  const [simulateOffline, setSimulateOffline] = useState(false)

  // Real-time hooks
  const {
    isConnected,
    lastError: connectionError,
    connect,
    disconnect
  } = useRealTimeContext()

  const { isReconnecting } = useRealtime([])

  // Offline hooks
  const {
    isOnline,
    pendingOperations,
    isSyncing,
    queueOperation,
    forceSync,
    clearPendingOperations,
    pendingCount
  } = useOffline()

  // Multi-tab sync hooks
  const {
    tabId,
    activeTabs,
    activeTabCount,
    broadcastUserAction,
    invalidateQueries
  } = useMultiTabSync()

  // Tab coordination
  const {
    isActiveTab,
    isOnlyActiveTab,
    shouldMaintainConnection,
    shouldPerformAction,
    broadcastConnectionStatus
  } = useTabCoordination()

  // Optimistic updates
  const createTransactionMutation = useOptimisticCreateTransaction()

  // Simulate creating a transaction with optimistic updates
  const handleCreateTransaction = () => {
    const mockTransaction = {
      description: `Test transaction ${Date.now()}`,
      amount: Math.floor(Math.random() * 1000) + 10,
      type: 'expense' as const,
      category_id: 'test-category',
      account_id: 'test-account',
      date: new Date().toISOString()
    }

    createTransactionMutation.mutate(mockTransaction, {
      onSuccess: () => {
        toast.success('Transaction created successfully!')
        broadcastUserAction('Transaction Created', mockTransaction, true)
      },
      onError: (error) => {
        toast.error('Failed to create transaction')
      }
    })

    // Add to test operations
    const operation: TestOperation = {
      id: `op-${Date.now()}`,
      type: 'create',
      description: `Create transaction: ${mockTransaction.description}`,
      timestamp: Date.now(),
      status: 'pending'
    }
    setTestOperations(prev => [operation, ...prev])

    // Simulate API call result
    setTimeout(() => {
      if (Math.random() > 0.7) {
        // Simulate failure
        operation.status = 'failed'
      } else {
        operation.status = 'completed'
      }
      setTestOperations(prev => prev.map(op => op.id === operation.id ? operation : op))
    }, 2000)
  }

  // Simulate offline operation
  const handleOfflineOperation = () => {
    const operation = {
      type: 'CREATE' as const,
      entity: 'transaction' as const,
      data: {
        description: `Offline transaction ${Date.now()}`,
        amount: Math.floor(Math.random() * 500) + 10,
        type: 'expense'
      }
    }

    queueOperation(operation)
    toast.info('Operation queued for when online')
    broadcastUserAction('Offline Operation Queued', operation, true)
  }

  // Send test message to other tabs
  const handleSendMessage = () => {
    if (!testMessage.trim()) return

    broadcastUserAction('Test Message', { message: testMessage }, true)
    toast.success('Message sent to other tabs')
    setTestMessage('')
  }

  // Simulate connection toggle
  const handleToggleConnection = () => {
    if (isConnected) {
      disconnect()
      broadcastConnectionStatus(false, { reason: 'Manual disconnect' })
    } else {
      connect()
    }
  }

  // Trigger query invalidation across tabs
  const handleInvalidateQueries = () => {
    invalidateQueries([['transactions'], ['accounts'], ['categories']])
    toast.success('Query invalidation sent to all tabs')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">Real-time Sync Testing</h1>
        <p className="text-muted-foreground">
          Test real-time synchronization, offline mode, and multi-tab coordination.
        </p>
      </motion.div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real-time Status</CardTitle>
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isReconnecting ? 'Reconnecting...' : connectionError || 'WebSocket status'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Status</CardTitle>
            {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} operations pending` : 'All synced'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tabs</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTabCount}</div>
            <p className="text-xs text-muted-foreground">
              {isActiveTab ? 'This tab is active' : 'Tab is backgrounded'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tab Role</CardTitle>
            <Monitor className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isOnlyActiveTab() ? 'Primary' : 'Secondary'}
            </div>
            <p className="text-xs text-muted-foreground">
              {shouldMaintainConnection() ? 'Maintains connection' : 'Passive mode'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Tab Information
          </CardTitle>
          <CardDescription>
            Information about this tab and other active tabs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Tab ID</Label>
            <code className="block p-2 bg-muted rounded text-sm">{tabId}</code>
          </div>
          
          <div className="space-y-2">
            <Label>Active Tabs ({activeTabs.length})</Label>
            <div className="space-y-1">
              {activeTabs.map((tab) => (
                <div key={tab.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <code className="text-xs">{tab.id.substring(0, 16)}...</code>
                    <div className="text-xs text-muted-foreground">
                      {new URL(tab.url).pathname}
                    </div>
                  </div>
                  <Badge variant={tab.isActive ? 'default' : 'secondary'}>
                    {tab.isActive ? 'Active' : 'Background'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Real-time Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleCreateTransaction} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Optimistic Transaction
            </Button>
            
            <Button onClick={handleOfflineOperation} className="w-full" variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Queue Offline Operation
            </Button>
            
            <Button onClick={handleToggleConnection} className="w-full" variant="outline">
              {isConnected ? <WifiOff className="h-4 w-4 mr-2" /> : <Wifi className="h-4 w-4 mr-2" />}
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
            
            <Button onClick={handleInvalidateQueries} className="w-full" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Invalidate Queries (All Tabs)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Multi-tab Messaging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testMessage">Send Message to Other Tabs</Label>
              <Input
                id="testMessage"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message..."
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
            </div>
            
            <Button onClick={handleSendMessage} disabled={!testMessage.trim()} className="w-full">
              Send Message
            </Button>
            
            {pendingCount > 0 && (
              <div className="space-y-2">
                <Button onClick={forceSync} disabled={isSyncing} className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Force Sync ({pendingCount})
                </Button>
                
                <Button onClick={clearPendingOperations} variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Pending Operations
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Operations */}
      {testOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Operations</CardTitle>
            <CardDescription>
              Recent operations performed in this tab
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testOperations.slice(0, 10).map((operation) => (
                <div key={operation.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="text-sm font-medium">{operation.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(operation.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <Badge
                    variant={
                      operation.status === 'completed' ? 'default' :
                      operation.status === 'failed' ? 'destructive' : 'secondary'
                    }
                  >
                    {operation.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Multi-tab Testing:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open this page in multiple browser tabs</li>
              <li>Observe the "Active Tabs" count increase</li>
              <li>Send messages between tabs using the messaging feature</li>
              <li>Create transactions and see optimistic updates</li>
              <li>Switch between tabs and observe active/background status changes</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Offline Testing:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Disconnect your internet connection</li>
              <li>Create offline operations and observe them being queued</li>
              <li>Reconnect and watch operations sync automatically</li>
              <li>Use the "Force Sync" button to manually trigger synchronization</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Real-time Testing:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Toggle the WebSocket connection on/off</li>
              <li>Observe connection status changes across all tabs</li>
              <li>Create optimistic transactions and watch them resolve</li>
              <li>Use query invalidation to refresh data across tabs</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}