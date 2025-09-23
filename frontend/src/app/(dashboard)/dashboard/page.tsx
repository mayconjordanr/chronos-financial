'use client'

import { useState } from "react"
import { motion } from "framer-motion"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { AdvancedTransactions } from "@/components/dashboard/advanced-transactions"
import { FinancialCharts } from "@/components/dashboard/financial-charts"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { SyncIndicator } from "@/components/dashboard/sync-indicator"
import { WhatsAppDemo } from "@/components/dashboard/whatsapp-demo"
import { TransactionDialog, useTransactionDialog } from "@/components/dialogs/transaction-dialog"
import { AccountDialog, useAccountDialog } from "@/components/dialogs/account-dialog"
import { CardDialog } from "@/components/dialogs/card-dialog"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useFinancialData } from "@/lib/hooks/use-financial-data"
import { Transaction } from "@/types/api"
import { CardFormData } from "@/lib/schemas/card"

export default function DashboardPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [optimisticTransactions, setOptimisticTransactions] = useState<Transaction[]>([])

  const {
    kpiData,
    transactions,
    categoryData,
    trendData,
    isLoading,
    syncStatus,
    lastSync,
    refetch
  } = useFinancialData(refreshTrigger)

  // Transaction dialog hook
  const {
    isOpen: isTransactionDialogOpen,
    mode: transactionDialogMode,
    transaction: selectedTransaction,
    defaultType: defaultTransactionType,
    openCreateDialog: openCreateTransactionDialog,
    openEditDialog: openEditTransactionDialog,
    closeDialog: closeTransactionDialog,
  } = useTransactionDialog()

  // Account dialog hook
  const {
    open: isAccountDialogOpen,
    mode: accountDialogMode,
    selectedAccount,
    openCreateDialog: openCreateAccountDialog,
    openEditDialog: openEditAccountDialog,
    closeDialog: closeAccountDialog,
    setOpen: setAccountDialogOpen
  } = useAccountDialog()

  // Card dialog state
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false)
  const [cardDialogMode, setCardDialogMode] = useState<'create' | 'edit' | 'view'>('create')

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
    refetch()
  }

  const handleAddTransaction = () => {
    openCreateTransactionDialog('expense')
  }

  const handleTransactionSuccess = (transaction: Transaction) => {
    // Optimistic update - add to local state immediately
    setOptimisticTransactions(prev => [transaction, ...prev])

    // Trigger data refresh after a short delay to get server state
    setTimeout(() => {
      handleRefresh()
      setOptimisticTransactions([])
    }, 1000)
  }

  const handleAddAccount = () => {
    openCreateAccountDialog()
  }

  const handleAccountSuccess = () => {
    // In a real app, you would refetch account data here
    handleRefresh()
  }

  const handleAddCard = () => {
    setCardDialogMode('create')
    setIsCardDialogOpen(true)
  }

  const handleCardSubmit = async (data: CardFormData) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log('Card created:', data)
    // In real app, this would trigger data refresh
    handleRefresh()
  }

  const handleTransfer = () => {
    openCreateTransactionDialog('transfer')
  }

  const handleExport = () => {
    // TODO: Export financial data
    console.log('Export data')
  }

  const handleImport = () => {
    // TODO: Import financial data
    console.log('Import data')
  }

  // Merge optimistic transactions with actual transactions
  const allTransactions = [...optimisticTransactions, ...(transactions || [])]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s your financial overview.
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <KPICards data={kpiData} isLoading={isLoading} />

      {/* Charts */}
      <FinancialCharts
        categoryData={categoryData}
        trendData={trendData}
        isLoading={isLoading}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transactions - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <AdvancedTransactions
            transactions={allTransactions}
            isLoading={isLoading}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={openEditTransactionDialog}
          />
        </div>

        {/* Right Sidebar - Takes 1 column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions */}
          <QuickActions
            onAddTransaction={handleAddTransaction}
            onAddAccount={handleAddAccount}
            onAddCard={handleAddCard}
            onTransfer={handleTransfer}
            onExport={handleExport}
            onImport={handleImport}
          />

          {/* WhatsApp Integration Demo */}
          <WhatsAppDemo />
        </div>
      </div>

      {/* Real-time Sync Indicator */}
      <SyncIndicator
        status={syncStatus}
        lastSync={lastSync}
        onRetry={handleRefresh}
      />

      {/* Transaction Dialog */}
      <TransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={closeTransactionDialog}
        mode={transactionDialogMode}
        transaction={selectedTransaction}
        defaultType={defaultTransactionType}
        onSuccess={handleTransactionSuccess}
      />

      {/* Account Dialog */}
      <AccountDialog
        open={isAccountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        mode={accountDialogMode}
        account={selectedAccount}
        onSuccess={handleAccountSuccess}
      />

      {/* Card Dialog */}
      <CardDialog
        isOpen={isCardDialogOpen}
        onClose={() => setIsCardDialogOpen(false)}
        mode={cardDialogMode}
        onSubmit={handleCardSubmit}
      />
    </div>
  )
}