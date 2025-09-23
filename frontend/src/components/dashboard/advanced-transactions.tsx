'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Transaction } from "@/types/api"

interface AdvancedTransactionsProps {
  transactions?: Transaction[]
  isLoading?: boolean
  onAddTransaction?: () => void
  onEditTransaction?: (transaction: Transaction) => void
}

export function AdvancedTransactions({
  transactions = [],
  isLoading,
  onAddTransaction,
  onEditTransaction
}: AdvancedTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [sortField, setSortField] = useState<keyof Transaction>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = transaction.description
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesType = filterType === "all" || transaction.type === filterType
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      const multiplier = sortOrder === "asc" ? 1 : -1

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * multiplier
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * multiplier
      }
      return 0
    })

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />
    }
  }

  const getAmountColor = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return 'text-green-600'
      case 'expense':
        return 'text-red-600'
      case 'transfer':
        return 'text-blue-600'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <Button onClick={onAddTransaction} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredTransactions.map((transaction) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(transaction.date)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.category_id || 'Uncategorized'}</Badge>
                    </TableCell>
                    <TableCell>{transaction.account_id}</TableCell>
                    <TableCell className={`text-right font-medium ${getAmountColor(transaction.type)}`}>
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.status === 'completed' ? 'default' :
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found matching your criteria
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}