'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, TrendingUp, DollarSign, Star } from 'lucide-react'

import { Card as CardType, CardFormData } from '@/lib/schemas/card'
import { CardList } from '@/components/cards/card-list'
import { CardDialogManager } from '@/components/dialogs/card-dialog'
import { formatCurrency } from '@/lib/utils/card-utils'
import { motion } from 'framer-motion'

export default function CardsPage() {
  // Mock data for cards - in real app, this would come from an API
  const [cards, setCards] = useState<CardType[]>([
    {
      id: '1',
      name: 'Primary Debit Card',
      last4digits: '1234',
      type: 'debit',
      network: 'visa',
      expiryDate: '2027-12',
      bank: 'Chase Bank',
      isPrimary: true,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      isActive: true,
    },
    {
      id: '2',
      name: 'Rewards Credit Card',
      last4digits: '5678',
      type: 'credit',
      network: 'mastercard',
      expiryDate: '2026-08',
      bank: 'Wells Fargo',
      creditLimit: 15000,
      isPrimary: false,
      createdAt: '2024-02-10T14:30:00Z',
      updatedAt: '2024-02-10T14:30:00Z',
      isActive: true,
    },
    {
      id: '3',
      name: 'Business Credit Card',
      last4digits: '9012',
      type: 'credit',
      network: 'amex',
      expiryDate: '2025-05',
      bank: 'American Express',
      creditLimit: 25000,
      isPrimary: false,
      createdAt: '2024-03-05T09:15:00Z',
      updatedAt: '2024-03-05T09:15:00Z',
      isActive: true,
    },
    {
      id: '4',
      name: 'Savings Debit Card',
      last4digits: '3456',
      type: 'debit',
      network: 'discover',
      expiryDate: '2025-11',
      bank: 'Discover Bank',
      isPrimary: false,
      createdAt: '2024-04-20T16:45:00Z',
      updatedAt: '2024-04-20T16:45:00Z',
      isActive: false,
    },
  ])

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit' | 'view' | 'delete'
    selectedCard?: CardType
  }>({
    isOpen: false,
    mode: 'create',
  })

  const [isLoading, setIsLoading] = useState(false)

  // Calculate statistics
  const stats = {
    totalCards: cards.length,
    activeCards: cards.filter(card => card.isActive).length,
    creditCards: cards.filter(card => card.type === 'credit').length,
    debitCards: cards.filter(card => card.type === 'debit').length,
    totalCreditLimit: cards
      .filter(card => card.type === 'credit' && card.creditLimit)
      .reduce((sum, card) => sum + (card.creditLimit || 0), 0),
    primaryCard: cards.find(card => card.isPrimary),
  }

  const handleAddCard = () => {
    setDialogState({
      isOpen: true,
      mode: 'create',
    })
  }

  const handleEditCard = (card: CardType) => {
    setDialogState({
      isOpen: true,
      mode: 'edit',
      selectedCard: card,
    })
  }

  const handleDeleteCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId)
    if (card) {
      setDialogState({
        isOpen: true,
        mode: 'delete',
        selectedCard: card,
      })
    }
  }

  const handleSetPrimary = async (cardId: string) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      setCards(prevCards =>
        prevCards.map(card => ({
          ...card,
          isPrimary: card.id === cardId,
        }))
      )
    } catch (error) {
      console.error('Failed to set primary card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitCard = async (data: CardFormData) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (dialogState.mode === 'create') {
        const newCard: CardType = {
          ...data,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        }

        // If this is the first card or marked as primary, make it primary
        if (cards.length === 0 || data.isPrimary) {
          setCards(prevCards => [
            ...prevCards.map(card => ({ ...card, isPrimary: false })),
            newCard,
          ])
        } else {
          setCards(prevCards => [...prevCards, newCard])
        }
      } else if (dialogState.mode === 'edit' && dialogState.selectedCard) {
        setCards(prevCards =>
          prevCards.map(card => {
            if (card.id === dialogState.selectedCard?.id) {
              return {
                ...card,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            }
            // If this card is being set as primary, remove primary from others
            if (data.isPrimary && card.isPrimary) {
              return { ...card, isPrimary: false }
            }
            return card
          })
        )
      }
    } catch (error) {
      console.error('Failed to save card:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!dialogState.selectedCard) return

    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const cardToDelete = dialogState.selectedCard
      setCards(prevCards => {
        const filtered = prevCards.filter(card => card.id !== cardToDelete.id)

        // If we deleted the primary card and there are other cards, make the first one primary
        if (cardToDelete.isPrimary && filtered.length > 0) {
          filtered[0].isPrimary = true
        }

        return filtered
      })
    } catch (error) {
      console.error('Failed to delete card:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseDialog = () => {
    setDialogState({
      isOpen: false,
      mode: 'create',
    })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cards</h1>
          <p className="text-muted-foreground">
            Manage your credit and debit cards
          </p>
        </div>
      </motion.div>

      {/* Statistics */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCards}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeCards} active, {stats.totalCards - stats.activeCards} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit vs Debit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creditCards}:{stats.debitCards}</div>
              <p className="text-xs text-muted-foreground">
                {stats.creditCards} credit, {stats.debitCards} debit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credit Limit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalCreditLimit)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {stats.creditCards} credit cards
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Primary Card</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.primaryCard ? `•••• ${stats.primaryCard.last4digits}` : 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.primaryCard ? stats.primaryCard.name : 'No primary card set'}
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Cards List */}
      <motion.div variants={itemVariants}>
        <CardList
          cards={cards}
          isLoading={isLoading}
          onAddCard={handleAddCard}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onSetPrimary={handleSetPrimary}
        />
      </motion.div>

      {/* Dialog */}
      <CardDialogManager
        isOpen={dialogState.isOpen}
        onClose={handleCloseDialog}
        mode={dialogState.mode}
        card={dialogState.selectedCard}
        onSubmit={handleSubmitCard}
        onDelete={handleDeleteConfirm}
        isLoading={isLoading}
      />
    </motion.div>
  )
}