'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AccountType,
  type AccountTypeValue,
  accountTypeMetadata,
  type Account
} from '@/lib/schemas/account'

interface AccountListProps {
  accounts: Account[]
  isLoading?: boolean
  onEdit: (account: Account) => void
  onDelete: (accountId: string) => void
  onViewTransactions: (accountId: string) => void
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'balance' | 'type' | 'bank'
type SortOrder = 'asc' | 'desc'

const accountTypeIcons = {
  [AccountType.CHECKING]: Building2,
  [AccountType.SAVINGS]: PiggyBank,
  [AccountType.CREDIT]: CreditCard,
  [AccountType.INVESTMENT]: TrendingUp
}

export function AccountList({
  accounts,
  isLoading = false,
  onEdit,
  onDelete,
  onViewTransactions
}: AccountListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<AccountTypeValue | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Filter and sort accounts
  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = accounts

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (account) =>
          account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.bank.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((account) => account.type === filterType)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'balance':
          aValue = a.balance
          bValue = b.balance
          break
        case 'type':
          aValue = a.type
          bValue = b.type
          break
        case 'bank':
          aValue = a.bank.toLowerCase()
          bValue = b.bank.toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [accounts, searchTerm, filterType, sortBy, sortOrder])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const AccountCard = ({ account }: { account: Account }) => {
    const Icon = accountTypeIcons[account.type]
    const metadata = accountTypeMetadata[account.type]

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        layout
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate">
              {account.name}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewTransactions(account.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Transactions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(account)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(account.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 mb-3">
              <div className={`p-2 rounded-lg ${metadata.color} text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold">
                  {formatCurrency(account.balance)}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metadata.label}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground truncate">
                {account.bank}
              </div>
              {account.description && (
                <div className="text-xs text-muted-foreground truncate">
                  {account.description}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  const AccountRow = ({ account }: { account: Account }) => {
    const Icon = accountTypeIcons[account.type]
    const metadata = accountTypeMetadata[account.type]

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        layout
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className={`p-2 rounded-lg ${metadata.color} text-white flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{account.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {account.bank}
                  </div>
                </div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    {metadata.label}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    {formatCurrency(account.balance)}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewTransactions(account.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Transactions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(account)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Account
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(account.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Loading skeletons for controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>

        {/* Loading skeletons for accounts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter by type */}
        <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.values(AccountType).map((type) => (
              <SelectItem key={type} value={type}>
                {accountTypeMetadata[type].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={`${sortBy}-${sortOrder}`}
          onValueChange={(value) => {
            const [field, order] = value.split('-')
            setSortBy(field as SortBy)
            setSortOrder(order as SortOrder)
          }}
        >
          <SelectTrigger className="w-32">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="balance-desc">Balance High-Low</SelectItem>
            <SelectItem value="balance-asc">Balance Low-High</SelectItem>
            <SelectItem value="type-asc">Type A-Z</SelectItem>
            <SelectItem value="bank-asc">Bank A-Z</SelectItem>
          </SelectContent>
        </Select>

        {/* View mode toggle */}
        <div className="flex rounded-lg border">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Account List */}
      <AnimatePresence mode="popLayout">
        {filteredAndSortedAccounts.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
            }
          >
            {filteredAndSortedAccounts.map((account) =>
              viewMode === 'grid' ? (
                <AccountCard key={account.id} account={account} />
              ) : (
                <AccountRow key={account.id} account={account} />
              )
            )}
          </div>
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No accounts found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first account to track your finances'}
              </p>
            </CardContent>
          </Card>
        )}
      </AnimatePresence>
    </div>
  )
}