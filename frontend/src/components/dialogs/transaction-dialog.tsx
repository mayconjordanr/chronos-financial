'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit3 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/forms/transaction-form'
import { TransactionFormData, TransferFormData } from '@/lib/schemas/transaction'
import { Account, Category, Transaction } from '@/types/api'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit'
  transaction?: Transaction
  defaultType?: 'income' | 'expense' | 'transfer'
  onSuccess?: (transaction: Transaction) => void
}

// Mock data hooks - replace these with actual data fetching hooks
const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAccounts([
        {
          id: '1',
          name: 'Checking Account',
          type: 'checking',
          balance: 5420.50,
          currency: 'USD',
          institution: 'Chase Bank',
          account_number: '****1234',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Savings Account',
          type: 'savings',
          balance: 12500.00,
          currency: 'USD',
          institution: 'Wells Fargo',
          account_number: '****5678',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '3',
          name: 'Credit Card',
          type: 'credit',
          balance: -850.25,
          currency: 'USD',
          institution: 'American Express',
          account_number: '****9012',
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
      setIsLoading(false)
    }, 500)
  }, [])

  return { accounts, isLoading }
}

const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCategories([
        {
          id: '1',
          name: 'Groceries',
          color: '#ef4444',
          type: 'expense',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Transportation',
          color: '#f97316',
          type: 'expense',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '3',
          name: 'Entertainment',
          color: '#8b5cf6',
          type: 'expense',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '4',
          name: 'Salary',
          color: '#22c55e',
          type: 'income',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '5',
          name: 'Freelance',
          color: '#06b6d4',
          type: 'income',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '6',
          name: 'Investment',
          color: '#3b82f6',
          type: 'income',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
      setIsLoading(false)
    }, 300)
  }, [])

  return { categories, isLoading }
}

export function TransactionDialog({
  open,
  onOpenChange,
  mode = 'create',
  transaction,
  onSuccess,
}: TransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { accounts, isLoading: accountsLoading } = useAccounts()
  const { categories, isLoading: categoriesLoading } = useCategories()

  const isLoading = accountsLoading || categoriesLoading

  const handleSubmit = async (data: TransactionFormData | TransferFormData) => {
    setIsSubmitting(true)

    try {
      let response: Transaction

      if (mode === 'create') {
        // Create new transaction
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        response = {
          id: Math.random().toString(36).substr(2, 9),
          account_id: data.account_id,
          category_id: data.category_id || undefined,
          amount: data.amount,
          description: data.description,
          date: new Date(data.date).toISOString(),
          type: data.type,
          status: 'completed' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        toast.success('Transaction created successfully', {
          description: `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} of $${data.amount.toFixed(2)} has been recorded.`,
        })
      } else {
        // Update existing transaction
        if (!transaction) throw new Error('Transaction not found')

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        response = {
          ...transaction,
          account_id: data.account_id,
          category_id: data.category_id || undefined,
          amount: data.amount,
          description: data.description,
          date: new Date(data.date).toISOString(),
          type: data.type,
          updated_at: new Date().toISOString(),
        }

        toast.success('Transaction updated successfully', {
          description: `Your ${data.type} has been updated.`,
        })
      }

      // Call success callback with optimistic update
      onSuccess?.(response)

      // Close dialog
      onOpenChange(false)
    } catch (error) {
      console.error('Transaction error:', error)
      toast.error(
        mode === 'create' ? 'Failed to create transaction' : 'Failed to update transaction',
        {
          description: error instanceof Error ? error.message : 'Please try again.',
        }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              {mode === 'create' ? (
                <Plus className="h-5 w-5 text-primary" />
              ) : (
                <Edit3 className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl">
                {mode === 'create' ? 'Create Transaction' : 'Edit Transaction'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'create'
                  ? 'Add a new income, expense, or transfer to your financial records.'
                  : 'Update the transaction details below.'}
              </DialogDescription>
            </div>
          </motion.div>
        </DialogHeader>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-12"
          >
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading form data...</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TransactionForm
              mode={mode}
              transaction={transaction}
              accounts={accounts}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
            />
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Export hook for easier usage
export function useTransactionDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [transaction, setTransaction] = useState<Transaction | undefined>()
  const [defaultType, setDefaultType] = useState<'income' | 'expense' | 'transfer'>('expense')

  const openCreateDialog = (type: 'income' | 'expense' | 'transfer' = 'expense') => {
    setMode('create')
    setTransaction(undefined)
    setDefaultType(type)
    setIsOpen(true)
  }

  const openEditDialog = (transactionToEdit: Transaction) => {
    setMode('edit')
    setTransaction(transactionToEdit)
    setIsOpen(true)
  }

  const closeDialog = () => {
    setIsOpen(false)
    // Clear state after animation completes
    setTimeout(() => {
      setTransaction(undefined)
      setMode('create')
      setDefaultType('expense')
    }, 300)
  }

  return {
    isOpen,
    mode,
    transaction,
    defaultType,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  }
}