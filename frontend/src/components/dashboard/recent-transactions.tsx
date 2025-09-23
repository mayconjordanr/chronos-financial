'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Transaction } from '@/types/api'
import { formatDistanceToNow } from 'date-fns'

interface RecentTransactionsProps {
  transactions?: Transaction[]
}

export function RecentTransactions({ transactions = [] }: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'expense':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'transfer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest financial activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start by adding your first transaction
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>
          Your latest financial activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between space-x-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {transaction.description}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getTransactionTypeColor(transaction.type)}>
                    {transaction.type}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(transaction.date), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <div className="text-sm font-medium">
                <span
                  className={
                    transaction.type === 'income'
                      ? 'text-green-600 dark:text-green-400'
                      : transaction.type === 'expense'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }
                >
                  {transaction.type === 'expense' ? '-' : '+'}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}