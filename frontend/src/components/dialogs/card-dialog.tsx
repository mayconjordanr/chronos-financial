'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Card, CardFormData } from '@/lib/schemas/card'
import { CardForm } from '@/components/forms/card-form'
import { CardComponent } from '@/components/cards/card-component'

interface CardDialogProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit' | 'view'
  card?: Card
  onSubmit: (data: CardFormData) => Promise<void>
  isLoading?: boolean
}

interface DeleteCardDialogProps {
  isOpen: boolean
  onClose: () => void
  card: Card
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

interface CardDialogState {
  isSubmitting: boolean
  submitSuccess: boolean
  submitError: string | null
}

export function CardDialog({
  isOpen,
  onClose,
  mode,
  card,
  onSubmit,
  isLoading = false,
}: CardDialogProps) {
  const [state, setState] = useState<CardDialogState>({
    isSubmitting: false,
    submitSuccess: false,
    submitError: null,
  })

  const handleSubmit = async (data: CardFormData) => {
    setState(prev => ({ ...prev, isSubmitting: true, submitError: null }))

    try {
      await onSubmit(data)
      setState(prev => ({ ...prev, isSubmitting: false, submitSuccess: true }))

      // Show success state briefly, then close
      setTimeout(() => {
        setState({ isSubmitting: false, submitSuccess: false, submitError: null })
        onClose()
      }, 1500)
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: error instanceof Error ? error.message : 'An error occurred',
      }))
    }
  }

  const handleClose = () => {
    if (!state.isSubmitting) {
      setState({ isSubmitting: false, submitSuccess: false, submitError: null })
      onClose()
    }
  }

  const getDialogTitle = () => {
    switch (mode) {
      case 'create':
        return 'Add New Card'
      case 'edit':
        return 'Edit Card'
      case 'view':
        return 'Card Details'
      default:
        return 'Card'
    }
  }

  const getDialogDescription = () => {
    switch (mode) {
      case 'create':
        return 'Add a new credit or debit card to your account. Only the last 4 digits are required for security.'
      case 'edit':
        return 'Update your card information. Changes will be reflected immediately.'
      case 'view':
        return 'View your card details and manage settings.'
      default:
        return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDialogTitle()}
            {card?.isPrimary && (
              <Badge variant="secondary">Primary</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AnimatePresence mode="wait">
            {state.submitSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-8"
              >
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  {mode === 'create' ? 'Card Added Successfully!' : 'Card Updated Successfully!'}
                </h3>
                <p className="text-muted-foreground">
                  Your card has been {mode === 'create' ? 'added' : 'updated'} and is ready to use.
                </p>
              </motion.div>
            ) : state.submitError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-600">{state.submitError}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setState(prev => ({ ...prev, submitError: null }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {mode !== 'view' && (
                  <CardForm
                    initialData={card}
                    mode={mode}
                    onSubmit={handleSubmit}
                    isLoading={state.isSubmitting}
                  />
                )}
              </motion.div>
            ) : mode === 'view' && card ? (
              <motion.div
                key="view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Card Preview */}
                <div className="flex justify-center">
                  <CardComponent card={card} size="large" interactive={false} />
                </div>

                {/* Card Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Card Information
                    </h4>
                    <div className="space-y-1">
                      <p><span className="font-medium">Name:</span> {card.name}</p>
                      <p><span className="font-medium">Type:</span> <span className="capitalize">{card.type}</span></p>
                      <p><span className="font-medium">Network:</span> <span className="capitalize">{card.network}</span></p>
                      <p><span className="font-medium">Bank:</span> {card.bank}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Details
                    </h4>
                    <div className="space-y-1">
                      <p><span className="font-medium">Last 4 Digits:</span> {card.last4digits}</p>
                      <p><span className="font-medium">Expires:</span> {card.expiryDate}</p>
                      {card.type === 'credit' && card.creditLimit && (
                        <p><span className="font-medium">Credit Limit:</span> ${card.creditLimit.toLocaleString()}</p>
                      )}
                      <p><span className="font-medium">Status:</span> {card.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CardForm
                  initialData={card}
                  mode={mode === 'view' ? 'edit' : mode}
                  onSubmit={handleSubmit}
                  isLoading={state.isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {mode === 'view' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function DeleteCardDialog({
  isOpen,
  onClose,
  card,
  onConfirm,
  isLoading = false,
}: DeleteCardDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Failed to delete card:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete Card
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{card.name}</strong>?
            </p>
            <p className="text-sm">
              This action cannot be undone. The card ending in <strong>{card.last4digits}</strong> will be permanently removed from your account.
            </p>
            {card.isPrimary && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This is your primary card. You may want to set another card as primary before deleting this one.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting || isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Card'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Combined dialog manager for easier state management
interface CardDialogManagerProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit' | 'view' | 'delete'
  card?: Card
  onSubmit?: (data: CardFormData) => Promise<void>
  onDelete?: () => Promise<void>
  isLoading?: boolean
}

export function CardDialogManager({
  isOpen,
  onClose,
  mode,
  card,
  onSubmit,
  onDelete,
  isLoading = false,
}: CardDialogManagerProps) {
  if (mode === 'delete' && card && onDelete) {
    return (
      <DeleteCardDialog
        isOpen={isOpen}
        onClose={onClose}
        card={card}
        onConfirm={onDelete}
        isLoading={isLoading}
      />
    )
  }

  if (onSubmit) {
    return (
      <CardDialog
        isOpen={isOpen}
        onClose={onClose}
        mode={mode as 'create' | 'edit' | 'view'}
        card={card}
        onSubmit={onSubmit}
        isLoading={isLoading}
      />
    )
  }

  return null
}