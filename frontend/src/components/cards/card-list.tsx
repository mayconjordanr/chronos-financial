'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Grid, List, Plus, MoreHorizontal, Edit2, Trash2, Star } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Card, CardType, CardNetwork } from '@/lib/schemas/card'
import { getSupportedNetworks } from '@/lib/data/card-networks'
import { filterCardsBySearch, sortCardsByPriority } from '@/lib/utils/card-utils'
import { CardComponent, CompactCardComponent, CardSkeleton } from './card-component'

interface CardListProps {
  cards: Card[]
  isLoading?: boolean
  onAddCard: () => void
  onEditCard: (card: Card) => void
  onDeleteCard: (cardId: string) => void
  onSetPrimary: (cardId: string) => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | CardType
type SortOption = 'name' | 'recent' | 'expiry' | 'type'

export function CardList({
  cards,
  isLoading = false,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onSetPrimary,
  className,
}: CardListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterNetwork, setFilterNetwork] = useState<CardNetwork | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  const supportedNetworks = getSupportedNetworks()

  // Filter and sort cards
  const filteredAndSortedCards = useMemo(() => {
    let filtered = filterCardsBySearch(cards, searchQuery)

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(card => card.type === filterType)
    }

    // Filter by network
    if (filterNetwork !== 'all') {
      filtered = filtered.filter(card => card.network === filterNetwork)
    }

    // Sort cards
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'expiry':
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        case 'type':
          return a.type.localeCompare(b.type)
        default:
          return 0
      }
    })

    // Always put primary cards first
    return sortCardsByPriority(sorted)
  }, [cards, searchQuery, filterType, filterNetwork, sortBy])

  const activeFiltersCount = [
    filterType !== 'all',
    filterNetwork !== 'all',
    searchQuery.trim() !== '',
  ].filter(Boolean).length

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

  const handleCardAction = (action: string, card: Card) => {
    switch (action) {
      case 'edit':
        onEditCard(card)
        break
      case 'delete':
        onDeleteCard(card.id)
        break
      case 'setPrimary':
        onSetPrimary(card.id)
        break
    }
  }

  const resetFilters = () => {
    setSearchQuery('')
    setFilterType('all')
    setFilterNetwork('all')
    setSortBy('recent')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for controls */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Loading skeleton for cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Your Cards</h2>
          <p className="text-muted-foreground">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'} total
          </p>
        </div>
        <Button onClick={onAddCard}>
          <Plus className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </div>

      {/* Filters and Controls */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards by name, last 4 digits, network, or bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
              </SelectContent>
            </Select>

            {/* Network Filter */}
            <Select value={filterNetwork} onValueChange={(value: CardNetwork | 'all') => setFilterNetwork(value)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {supportedNetworks.map((network) => (
                  <SelectItem key={network.name} value={network.name}>
                    {network.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="expiry">Expiry</SelectItem>
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>

            {/* Active Filters Indicator */}
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <Filter className="mr-2 h-4 w-4" />
                Clear Filters ({activeFiltersCount})
              </Button>
            )}
          </div>

          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {filteredAndSortedCards.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-12"
          >
            <div className="text-muted-foreground">
              {searchQuery || filterType !== 'all' || filterNetwork !== 'all' ? (
                <>
                  <p className="text-lg mb-2">No cards match your search</p>
                  <p>Try adjusting your filters or search terms</p>
                  <Button variant="outline" className="mt-4" onClick={resetFilters}>
                    Clear all filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">No cards yet</p>
                  <p>Add your first card to get started</p>
                  <Button className="mt-4" onClick={onAddCard}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Card
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`${viewMode}-${filteredAndSortedCards.length}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={
              viewMode === 'grid'
                ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'space-y-3'
            }
          >
            {filteredAndSortedCards.map((card) => (
              <motion.div
                key={card.id}
                variants={itemVariants}
                layout
                className="relative group"
              >
                {viewMode === 'grid' ? (
                  <div className="relative">
                    <CardComponent
                      card={card}
                      size="medium"
                      onClick={() => onEditCard(card)}
                    />

                    {/* Action Menu */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCardAction('edit', card)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit Card
                          </DropdownMenuItem>
                          {!card.isPrimary && (
                            <DropdownMenuItem onClick={() => handleCardAction('setPrimary', card)}>
                              <Star className="mr-2 h-4 w-4" />
                              Set as Primary
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCardAction('delete', card)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Card
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <CompactCardComponent
                      card={card}
                      onClick={() => onEditCard(card)}
                    />

                    {/* Action Menu for List View */}
                    <div className="absolute top-4 right-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCardAction('edit', card)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit Card
                          </DropdownMenuItem>
                          {!card.isPrimary && (
                            <DropdownMenuItem onClick={() => handleCardAction('setPrimary', card)}>
                              <Star className="mr-2 h-4 w-4" />
                              Set as Primary
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCardAction('delete', card)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Card
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Summary */}
      {filteredAndSortedCards.length > 0 && (
        <div className="mt-6 text-sm text-muted-foreground text-center">
          Showing {filteredAndSortedCards.length} of {cards.length} cards
          {activeFiltersCount > 0 && ' (filtered)'}
        </div>
      )}
    </div>
  )
}