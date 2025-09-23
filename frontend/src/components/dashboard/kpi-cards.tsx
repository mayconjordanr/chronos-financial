'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface KPIData {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  forecast: number
  balanceChange: number
  incomeChange: number
  expenseChange: number
  forecastChange: number
}

interface KPICardsProps {
  data?: KPIData
  isLoading?: boolean
}

export function KPICards({ data, isLoading }: KPICardsProps) {
  const cards = [
    {
      title: "Total Balance",
      value: data?.totalBalance ?? 0,
      change: data?.balanceChange ?? 0,
      icon: DollarSign,
      color: "blue",
      format: "currency"
    },
    {
      title: "Monthly Income",
      value: data?.monthlyIncome ?? 0,
      change: data?.incomeChange ?? 0,
      icon: TrendingUp,
      color: "green",
      format: "currency"
    },
    {
      title: "Monthly Expenses",
      value: data?.monthlyExpenses ?? 0,
      change: data?.expenseChange ?? 0,
      icon: TrendingDown,
      color: "red",
      format: "currency"
    },
    {
      title: "Forecast",
      value: data?.forecast ?? 0,
      change: data?.forecastChange ?? 0,
      icon: Target,
      color: "purple",
      format: "currency"
    }
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const isPositive = card.change >= 0
        const Icon = card.icon
        const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(card.value)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendIcon className={`mr-1 h-3 w-3 ${
                    isPositive ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                    {isPositive ? '+' : ''}{card.change.toFixed(1)}%
                  </span>
                  <span className="ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}