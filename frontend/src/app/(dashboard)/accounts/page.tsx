'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountList } from '@/components/accounts/account-list'
import { AccountDialog, useAccountDialog } from '@/components/dialogs/account-dialog'
import { AccountType, type Account } from '@/lib/schemas/account'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Mock data for accounts - replace with real data fetching
const mockAccounts: Account[] = [
  {
    id: '1',
    name: 'Primary Checking',
    type: AccountType.CHECKING,
    balance: 5250.75,
    bank: 'Chase Bank',
    description: 'Main checking account for daily expenses',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z'
  },
  {
    id: '2',
    name: 'Emergency Savings',
    type: AccountType.SAVINGS,
    balance: 15750.00,
    bank: 'Wells Fargo',
    description: 'Emergency fund - 6 months expenses',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z'
  },
  {
    id: '3',
    name: 'Travel Credit Card',
    type: AccountType.CREDIT,
    balance: -1250.50,
    bank: 'Capital One',
    description: 'Travel rewards credit card',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-22T00:00:00Z'
  },
  {
    id: '4',
    name: 'Investment Portfolio',
    type: AccountType.INVESTMENT,
    balance: 45000.25,
    bank: 'Fidelity',
    description: 'Long-term investment account',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-25T00:00:00Z'
  }
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    open,
    mode,
    selectedAccount,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    setOpen
  } = useAccountDialog()

  // Calculate statistics
  const accountStats = useMemo(() => {
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
    const positiveBalance = accounts
      .filter(account => account.balance > 0)
      .reduce((sum, account) => sum + account.balance, 0)
    const negativeBalance = accounts
      .filter(account => account.balance < 0)
      .reduce((sum, account) => sum + Math.abs(account.balance), 0)

    const accountsByType = accounts.reduce((acc, account) => {
      acc[account.type] = (acc[account.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalBalance,
      positiveBalance,
      negativeBalance,
      totalAccounts: accounts.length,
      accountsByType
    }
  }, [accounts])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleAccountSuccess = () => {
    // In a real app, you would refetch data here
    // For now, we'll just show a success message
    // The dialog handles the success toast
  }

  const handleEditAccount = (account: Account) => {
    openEditDialog(account)
  }

  const handleDeleteAccount = (accountId: string) => {
    // In a real app, this would be handled by the dialog
    // The dialog shows the confirmation and handles the deletion
    const accountToDelete = accounts.find(acc => acc.id === accountId)
    if (accountToDelete) {
      openEditDialog(accountToDelete)
    }
  }

  const handleViewTransactions = (accountId: string) => {
    // Navigate to transactions page filtered by account
    router.push(`/transactions?account=${accountId}`)
    toast.info('Navigating to transactions...')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts and financial institutions
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </motion.div>

      {/* Statistics Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountStats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Across {accountStats.totalAccounts} accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(accountStats.positiveBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Positive balances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liabilities</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(accountStats.negativeBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding debt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Accounts</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountStats.accountsByType[AccountType.CREDIT] || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active credit lines
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AccountList
          accounts={accounts}
          isLoading={isLoading}
          onEdit={handleEditAccount}
          onDelete={handleDeleteAccount}
          onViewTransactions={handleViewTransactions}
        />
      </motion.div>

      {/* Account Dialog */}
      <AccountDialog
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        account={selectedAccount}
        onSuccess={handleAccountSuccess}
      />
    </div>
  )
}