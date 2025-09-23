'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react'

interface StatsCardsProps {
  stats?: {
    total_balance: number
    income_this_month: number
    expenses_this_month: number
    transactions_count: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const cards = [
    {
      title: 'Total Balance',
      value: stats?.total_balance || 0,
      icon: DollarSign,
      format: formatCurrency,
    },
    {
      title: 'Income This Month',
      value: stats?.income_this_month || 0,
      icon: TrendingUp,
      format: formatCurrency,
      trend: 'positive',
    },
    {
      title: 'Expenses This Month',
      value: stats?.expenses_this_month || 0,
      icon: TrendingDown,
      format: formatCurrency,
      trend: 'negative',
    },
    {
      title: 'Total Transactions',
      value: stats?.transactions_count || 0,
      icon: CreditCard,
      format: (value: number) => value.toString(),
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.format(card.value)}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}