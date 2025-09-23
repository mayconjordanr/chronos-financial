'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AccountForm } from '@/components/forms/account-form'
import { AccountFormData, type Account } from '@/lib/schemas/account'
import { toast } from 'sonner'

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  account?: Account
  onSuccess?: () => void
}

// Simulated API functions - replace with real API calls
const mockCreateAccount = async (data: AccountFormData): Promise<Account> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Simulate random error (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Failed to create account. Please try again.')
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

const mockUpdateAccount = async (id: string, data: AccountFormData): Promise<Account> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800))

  // Simulate random error (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Failed to update account. Please try again.')
  }

  return {
    id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

const mockDeleteAccount = async (id: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600))

  // Simulate random error (5% chance)
  if (Math.random() < 0.05) {
    throw new Error('Failed to delete account. Please try again.')
  }
}

export function AccountDialog({
  open,
  onOpenChange,
  mode,
  account,
  onSuccess
}: AccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSubmit = async (data: AccountFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'create') {
        await mockCreateAccount(data)
        toast.success('Account created successfully!')
      } else {
        if (!account?.id) {
          throw new Error('Account ID is required for update')
        }
        await mockUpdateAccount(account.id, data)
        toast.success('Account updated successfully!')
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!account?.id) return

    setIsDeleting(true)
    try {
      await mockDeleteAccount(account.id)
      toast.success('Account deleted successfully!')
      setShowDeleteConfirm(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account'
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    if (isLoading) return
    setError(null)
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (isLoading) return
    if (!newOpen) {
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>
                  {mode === 'create' ? 'Create New Account' : 'Edit Account'}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'create'
                    ? 'Add a new financial account to track your balance and transactions.'
                    : 'Update your account information and settings.'}
                </DialogDescription>
              </div>
              {mode === 'edit' && account && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </DialogHeader>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AccountForm
                mode={mode}
                initialData={account}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to delete <strong>{account?.name}</strong>?
              <br />
              <br />
              This action cannot be undone. All associated transactions and data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {account && (
            <div className="my-4 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium">{account.name}</div>
              <div className="text-xs text-muted-foreground">
                {account.bank} • {account.type}
              </div>
              <div className="text-lg font-bold mt-1">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(account.balance)}
              </div>
            </div>
          )}

          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will permanently delete the account and all its transaction history.
            </AlertDescription>
          </Alert>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Hook for managing account dialog state
export function useAccountDialog() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>()

  const openCreateDialog = () => {
    setMode('create')
    setSelectedAccount(undefined)
    setOpen(true)
  }

  const openEditDialog = (account: Account) => {
    setMode('edit')
    setSelectedAccount(account)
    setOpen(true)
  }

  const closeDialog = () => {
    setOpen(false)
    setSelectedAccount(undefined)
  }

  return {
    open,
    mode,
    selectedAccount,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    setOpen
  }
}