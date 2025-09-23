'use client'

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

export function useFinancialData(refreshTrigger: number = 0) {
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'syncing' | 'error'>('connected')
  const [lastSync, setLastSync] = useState<Date>(new Date())

  // KPI Data Query
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard-kpi', refreshTrigger],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return {
        totalBalance: 25420.50,
        monthlyIncome: 8500.00,
        monthlyExpenses: 6200.30,
        forecast: 2300.20,
        balanceChange: 5.2,
        incomeChange: 12.5,
        expenseChange: -3.1,
        forecastChange: 8.7
      }
    }
  })

  // Transactions Query
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions', refreshTrigger],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 800))
      return [
        {
          id: '1',
          account_id: 'acc_1',
          category_id: 'cat_1',
          amount: 125.50,
          description: 'Grocery Store',
          date: '2024-01-15T00:00:00.000Z',
          type: 'expense' as const,
          status: 'completed' as const,
          created_at: '2024-01-15T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z'
        },
        {
          id: '2',
          account_id: 'acc_1',
          category_id: 'cat_2',
          amount: 4200.00,
          description: 'Salary Deposit',
          date: '2024-01-15T00:00:00.000Z',
          type: 'income' as const,
          status: 'completed' as const,
          created_at: '2024-01-15T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z'
        },
        {
          id: '3',
          account_id: 'acc_2',
          category_id: 'cat_1',
          amount: 12.50,
          description: 'Coffee Shop',
          date: '2024-01-14T00:00:00.000Z',
          type: 'expense' as const,
          status: 'pending' as const,
          created_at: '2024-01-14T00:00:00.000Z',
          updated_at: '2024-01-14T00:00:00.000Z'
        },
        {
          id: '4',
          account_id: 'acc_1',
          category_id: 'cat_3',
          amount: 1500.00,
          description: 'Freelance Project',
          date: '2024-01-13T00:00:00.000Z',
          type: 'income' as const,
          status: 'completed' as const,
          created_at: '2024-01-13T00:00:00.000Z',
          updated_at: '2024-01-13T00:00:00.000Z'
        },
        {
          id: '5',
          account_id: 'acc_2',
          category_id: 'cat_4',
          amount: 15.99,
          description: 'Netflix Subscription',
          date: '2024-01-12T00:00:00.000Z',
          type: 'expense' as const,
          status: 'completed' as const,
          created_at: '2024-01-12T00:00:00.000Z',
          updated_at: '2024-01-12T00:00:00.000Z'
        }
      ]
    }
  })

  // Category Data Query
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-breakdown', refreshTrigger],
    queryFn: async () => {
      // Mock data for now
      return [
        { name: 'Food', amount: 1200, color: '#FF6384', percentage: 35 },
        { name: 'Transport', amount: 800, color: '#36A2EB', percentage: 23 },
        { name: 'Entertainment', amount: 600, color: '#FFCE56', percentage: 18 },
        { name: 'Utilities', amount: 400, color: '#4BC0C0', percentage: 12 },
        { name: 'Shopping', amount: 400, color: '#9966FF', percentage: 12 }
      ]
    }
  })

  // Trend Data Query
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['trend-data', refreshTrigger],
    queryFn: async () => {
      // Mock data for now
      return [
        { month: 'Oct', income: 8000, expenses: 6000, net: 2000 },
        { month: 'Nov', income: 8200, expenses: 6200, net: 2000 },
        { month: 'Dec', income: 8500, expenses: 6500, net: 2000 },
        { month: 'Jan', income: 8500, expenses: 6200, net: 2300 }
      ]
    }
  })

  const isLoading = kpiLoading || transactionsLoading || categoryLoading || trendLoading

  const refetch = () => {
    setSyncStatus('syncing')
    // Refetch all queries
    setTimeout(() => {
      setSyncStatus('connected')
      setLastSync(new Date())
    }, 1000)
  }

  return {
    kpiData,
    transactions,
    categoryData,
    trendData,
    isLoading,
    syncStatus,
    lastSync,
    refetch
  }
}