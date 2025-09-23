'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStripe } from './use-stripe'
import { PlanManager } from '@/lib/services/plan-manager'

export interface UsageLimits {
  transactions: number // -1 for unlimited
  accounts: number
  categories: number
  reports: number
  whatsappMessages: number
  apiCalls: number
}

export interface UsageStats {
  transactions: number
  accounts: number
  categories: number
  reports: number
  whatsappMessages: number
  apiCalls: number
}

export interface UsageAlert {
  id: string
  type: 'warning' | 'limit_reached' | 'info'
  resource: keyof UsageStats
  title: string
  message: string
  percentage: number
  timestamp: string
}

interface UsageTrackingState {
  currentUsage: UsageStats
  limits: UsageLimits
  alerts: UsageAlert[]
  isLoading: boolean
  error: string | null
}

// Plan limits are now managed by PlanManager

export function useUsageTracking() {
  const { subscription, getPlanById } = useStripe()
  const [state, setState] = useState<UsageTrackingState>({
    currentUsage: {
      transactions: 0,
      accounts: 0,
      categories: 0,
      reports: 0,
      whatsappMessages: 0,
      apiCalls: 0
    },
    limits: PlanManager.getPlan('starter')?.limits || {
      transactions: 100,
      accounts: 3,
      categories: 10,
      reports: 5,
      whatsappMessages: 0,
      apiCalls: 0
    },
    alerts: [],
    isLoading: false,
    error: null
  })

  // Load usage data
  const loadUsage = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Mock current usage data
      const mockUsage: UsageStats = {
        transactions: 47,
        accounts: 2,
        categories: 8,
        reports: 3,
        whatsappMessages: 23,
        apiCalls: 156
      }

      // Get limits based on current plan
      const planId = subscription?.planId || 'starter'
      const planKey = planId.replace('price_', '')
      const plan = PlanManager.getPlan(planKey)
      const limits = plan?.limits || PlanManager.getPlan('starter')?.limits || {
        transactions: 100,
        accounts: 3,
        categories: 10,
        reports: 5,
        whatsappMessages: 0,
        apiCalls: 0
      }

      setState(prev => ({
        ...prev,
        currentUsage: mockUsage,
        limits,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load usage data',
        isLoading: false
      }))
    }
  }, [subscription?.planId])

  // Track usage increment
  const trackUsage = useCallback(async (resource: keyof UsageStats, amount = 1) => {
    try {
      // Update local state immediately
      setState(prev => ({
        ...prev,
        currentUsage: {
          ...prev.currentUsage,
          [resource]: prev.currentUsage[resource] + amount
        }
      }))

      // Send to API (in background)
      await fetch('/api/usage/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resource,
          amount,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to track usage:', error)
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        currentUsage: {
          ...prev.currentUsage,
          [resource]: Math.max(0, prev.currentUsage[resource] - amount)
        }
      }))
    }
  }, [])

  // Check if usage is within limits
  const checkLimit = useCallback((resource: keyof UsageStats, requestedAmount = 1) => {
    const currentAmount = state.currentUsage[resource]
    const limit = state.limits[resource]
    
    // Unlimited
    if (limit === -1) return { allowed: true, remaining: -1 }
    
    // Check if request would exceed limit
    const newTotal = currentAmount + requestedAmount
    const allowed = newTotal <= limit
    const remaining = Math.max(0, limit - currentAmount)
    
    return { allowed, remaining, limit, current: currentAmount }
  }, [state.currentUsage, state.limits])

  // Get usage percentage
  const getUsagePercentage = useCallback((resource: keyof UsageStats) => {
    const current = state.currentUsage[resource]
    const limit = state.limits[resource]
    
    if (limit === -1) return 0 // Unlimited
    return Math.min((current / limit) * 100, 100)
  }, [state.currentUsage, state.limits])

  // Check for usage alerts
  const checkAlerts = useCallback(() => {
    const alerts: UsageAlert[] = []
    
    Object.entries(state.currentUsage).forEach(([resource, used]) => {
      const limit = state.limits[resource as keyof UsageStats]
      
      if (limit === -1) return // Skip unlimited resources
      
      const percentage = (used / limit) * 100
      
      if (percentage >= 100) {
        alerts.push({
          id: `${resource}_limit_reached`,
          type: 'limit_reached',
          resource: resource as keyof UsageStats,
          title: `${resource.charAt(0).toUpperCase() + resource.slice(1)} Limit Reached`,
          message: `You've reached your ${resource} limit for this billing period.`,
          percentage: 100,
          timestamp: new Date().toISOString()
        })
      } else if (percentage >= 90) {
        alerts.push({
          id: `${resource}_warning_90`,
          type: 'warning',
          resource: resource as keyof UsageStats,
          title: `${resource.charAt(0).toUpperCase() + resource.slice(1)} Limit Warning`,
          message: `You've used ${Math.round(percentage)}% of your ${resource} limit.`,
          percentage: Math.round(percentage),
          timestamp: new Date().toISOString()
        })
      } else if (percentage >= 75) {
        alerts.push({
          id: `${resource}_warning_75`,
          type: 'warning',
          resource: resource as keyof UsageStats,
          title: `${resource.charAt(0).toUpperCase() + resource.slice(1)} Usage High`,
          message: `You've used ${Math.round(percentage)}% of your ${resource} limit.`,
          percentage: Math.round(percentage),
          timestamp: new Date().toISOString()
        })
      }
    })
    
    setState(prev => ({ ...prev, alerts }))
    return alerts
  }, [state.currentUsage, state.limits])

  // Get recommendations for upgrade
  const getUpgradeRecommendations = useCallback(() => {
    const recommendations: string[] = []
    
    Object.entries(state.currentUsage).forEach(([resource, used]) => {
      const limit = state.limits[resource as keyof UsageStats]
      
      if (limit === -1) return // Skip unlimited resources
      
      const percentage = (used / limit) * 100
      
      if (percentage >= 80) {
        recommendations.push(
          `Upgrade to Pro for unlimited ${resource.toLowerCase()}`
        )
      }
    })
    
    return recommendations
  }, [state.currentUsage, state.limits])

  // Reset usage (typically called at billing period start)
  const resetUsage = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        currentUsage: {
          transactions: 0,
          accounts: prev.currentUsage.accounts, // Don't reset count-based items
          categories: prev.currentUsage.categories,
          reports: 0,
          whatsappMessages: 0,
          apiCalls: 0
        },
        alerts: []
      }))

      await fetch('/api/usage/reset', {
        method: 'POST'
      })
    } catch (error) {
      console.error('Failed to reset usage:', error)
    }
  }, [])

  // Load usage data when component mounts or subscription changes
  useEffect(() => {
    loadUsage()
  }, [loadUsage])

  // Check for alerts when usage changes
  useEffect(() => {
    checkAlerts()
  }, [checkAlerts])

  // Format resource name for display
  const formatResourceName = useCallback((resource: keyof UsageStats) => {
    const names: Record<keyof UsageStats, string> = {
      transactions: 'Transactions',
      accounts: 'Accounts',
      categories: 'Categories',
      reports: 'Reports',
      whatsappMessages: 'WhatsApp Messages',
      apiCalls: 'API Calls'
    }
    return names[resource]
  }, [])

  // Get color for usage level
  const getUsageColor = useCallback((resource: keyof UsageStats) => {
    const percentage = getUsagePercentage(resource)
    
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }, [getUsagePercentage])

  return {
    // State
    currentUsage: state.currentUsage,
    limits: state.limits,
    alerts: state.alerts,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    loadUsage,
    trackUsage,
    resetUsage,
    
    // Utilities
    checkLimit,
    getUsagePercentage,
    getUpgradeRecommendations,
    formatResourceName,
    getUsageColor
  }
}