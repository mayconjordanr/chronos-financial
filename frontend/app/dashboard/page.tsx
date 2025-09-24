'use client'

import { useAuth } from '@/hooks/useAuth'
import { DashboardOverview } from '@/components/dashboard/overview'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { AccountsWidget } from '@/components/dashboard/accounts-widget'
import { BudgetSummary } from '@/components/dashboard/budget-summary'
import { GoalsWidget } from '@/components/dashboard/goals-widget'
import { InsightsWidget } from '@/components/dashboard/insights-widget'
import { Card } from '@/components/ui/card'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Here's what's happening with your finances today
        </p>
      </div>

      {/* Overview Cards */}
      <DashboardOverview />

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Recent Transactions */}
          <Card>
            <RecentTransactions />
          </Card>

          {/* Budget Summary */}
          <Card>
            <BudgetSummary />
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-8">
          {/* Accounts Widget */}
          <Card>
            <AccountsWidget />
          </Card>

          {/* Goals Widget */}
          <Card>
            <GoalsWidget />
          </Card>

          {/* Insights Widget */}
          <Card>
            <InsightsWidget />
          </Card>
        </div>
      </div>
    </div>
  )
}