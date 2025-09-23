'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartData } from '@/types/common'

interface FinancialChartProps {
  data?: ChartData[]
}

export function FinancialChart({ data = [] }: FinancialChartProps) {
  // For now, we'll create a simple mock chart
  // In a real app, you'd use a charting library like Recharts

  const mockData = data.length > 0 ? data : [
    { date: '2024-01', income: 5000, expenses: 3500, balance: 1500 },
    { date: '2024-02', income: 5200, expenses: 3800, balance: 1400 },
    { date: '2024-03', income: 4800, expenses: 3200, balance: 1600 },
    { date: '2024-04', income: 5500, expenses: 4000, balance: 1500 },
    { date: '2024-05', income: 5300, expenses: 3700, balance: 1600 },
    { date: '2024-06', income: 5800, expenses: 4200, balance: 1600 },
  ]

  const maxValue = Math.max(
    ...mockData.flatMap(d => [d.income, d.expenses, d.balance])
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>
          Monthly income, expenses, and net balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockData.map((item, index) => (
            <div key={item.date} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.date}</span>
                <span className="text-muted-foreground">
                  Net: ${item.balance.toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-16 text-xs text-green-600">Income</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(item.income / maxValue) * 100}%`
                      }}
                    />
                  </div>
                  <div className="w-16 text-xs text-right">
                    ${item.income.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-16 text-xs text-red-600">Expenses</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(item.expenses / maxValue) * 100}%`
                      }}
                    />
                  </div>
                  <div className="w-16 text-xs text-right">
                    ${item.expenses.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            This is a simplified chart. In production, use a proper charting library.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}