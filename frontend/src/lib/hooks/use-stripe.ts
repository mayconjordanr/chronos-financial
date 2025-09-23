'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PlanManager } from '@/lib/services/plan-manager'

export interface StripeSubscription {
  id: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  planId: string
  planName: string
  currentPeriodEnd: string
  currentPeriodStart: string
  trialEnd?: string
  cancelAtPeriodEnd: boolean
  amount: number
  currency: string
  interval: 'month' | 'year'
}

export interface StripeCustomer {
  id: string
  email: string
  name?: string
  defaultPaymentMethod?: string
}

export interface StripeInvoice {
  id: string
  number: string
  status: 'paid' | 'open' | 'void' | 'draft'
  amount: number
  currency: string
  created: string
  dueDate?: string
  pdfUrl?: string
}

export interface StripePlan {
  id: string
  name: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

interface StripeHookState {
  subscription: StripeSubscription | null
  customer: StripeCustomer | null
  invoices: StripeInvoice[]
  plans: StripePlan[]
  isLoading: boolean
  error: string | null
}

export function useStripe() {
  const [state, setState] = useState<StripeHookState>({
    subscription: null,
    customer: null,
    invoices: [],
    plans: [],
    isLoading: false,
    error: null
  })

  // Get plans from PlanManager
  const getStripePlans = useCallback((): StripePlan[] => {
    return PlanManager.getAllPlans().map(plan => ({
      id: `price_${plan.id}`,
      name: plan.name,
      amount: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features,
      popular: plan.popular
    }))
  }, [])

  // Load subscription data
  const loadSubscription = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock subscription data
      const mockSubscription: StripeSubscription = {
        id: 'sub_mock123',
        status: 'trialing',
        planId: 'price_starter',
        planName: 'Starter',
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodStart: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        amount: 0,
        currency: 'usd',
        interval: 'month'
      }

      const mockCustomer: StripeCustomer = {
        id: 'cus_mock123',
        email: 'user@example.com',
        name: 'John Doe'
      }

      setState(prev => ({
        ...prev,
        subscription: mockSubscription,
        customer: mockCustomer,
        plans: getStripePlans(),
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load subscription',
        isLoading: false
      }))
    }
  }, [])

  // Create Stripe checkout session
  const createCheckoutSession = useCallback(async (priceId: string, successUrl?: string, cancelUrl?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: successUrl || `${window.location.origin}/billing?success=true`,
          cancelUrl: cancelUrl || `${window.location.origin}/billing?canceled=true`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionId, url } = await response.json()
      
      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
        isLoading: false
      }))
      toast.error('Failed to start checkout process')
    }
  }, [])

  // Create customer portal session
  const createPortalSession = useCallback(async (returnUrl?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: returnUrl || window.location.origin
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Customer Portal
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No portal URL received')
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create portal session',
        isLoading: false
      }))
      toast.error('Failed to open billing portal')
    }
  }, [])

  // Cancel subscription
  const cancelSubscription = useCallback(async (subscriptionId: string, cancelAtPeriodEnd = true) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          cancelAtPeriodEnd
        })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      const updatedSubscription = await response.json()
      
      setState(prev => ({
        ...prev,
        subscription: updatedSubscription,
        isLoading: false
      }))
      
      toast.success(
        cancelAtPeriodEnd 
          ? 'Subscription will be canceled at the end of the billing period'
          : 'Subscription canceled immediately'
      )
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
        isLoading: false
      }))
      toast.error('Failed to cancel subscription')
    }
  }, [])

  // Reactivate subscription
  const reactivateSubscription = useCallback(async (subscriptionId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription')
      }

      const updatedSubscription = await response.json()
      
      setState(prev => ({
        ...prev,
        subscription: updatedSubscription,
        isLoading: false
      }))
      
      toast.success('Subscription reactivated successfully')
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
        isLoading: false
      }))
      toast.error('Failed to reactivate subscription')
    }
  }, [])

  // Load invoices
  const loadInvoices = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/stripe/invoices')
      
      if (!response.ok) {
        throw new Error('Failed to load invoices')
      }

      const invoices = await response.json()
      
      setState(prev => ({
        ...prev,
        invoices,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load invoices',
        isLoading: false
      }))
    }
  }, [])

  // Format currency
  const formatCurrency = useCallback((amount: number, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100) // Convert from cents to dollars
  }, [])

  // Get plan by ID
  const getPlanById = useCallback((planId: string) => {
    return state.plans.find(plan => plan.id === planId)
  }, [state.plans])

  // Check if user has access to feature
  const hasFeatureAccess = useCallback((feature: string) => {
    if (!state.subscription) return false
    
    const plan = getPlanById(state.subscription.planId)
    if (!plan) return false
    
    // For Pro plans, all features are available
    if (plan.name.toLowerCase().includes('pro')) return true
    
    // For Starter plan, check specific features
    return false
  }, [state.subscription, getPlanById])

  return {
    // State
    subscription: state.subscription,
    customer: state.customer,
    invoices: state.invoices,
    plans: state.plans,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    loadSubscription,
    createCheckoutSession,
    createPortalSession,
    cancelSubscription,
    reactivateSubscription,
    loadInvoices,
    
    // Utilities
    formatCurrency,
    getPlanById,
    hasFeatureAccess,

    // Plan management
    canUpgrade: useCallback((targetPlanId: string) => {
      if (!state.subscription) return false
      const currentPlanId = state.subscription.planId.replace('price_', '')
      const targetId = targetPlanId.replace('price_', '')
      return PlanManager.canUpgrade(currentPlanId, targetId)
    }, [state.subscription]),

    canDowngrade: useCallback((targetPlanId: string) => {
      if (!state.subscription) return false
      const currentPlanId = state.subscription.planId.replace('price_', '')
      const targetId = targetPlanId.replace('price_', '')
      return PlanManager.canDowngrade(currentPlanId, targetId)
    }, [state.subscription]),

    getTrialInfo: useCallback((planId: string) => {
      const id = planId.replace('price_', '')
      return PlanManager.getTrialInfo(id)
    }, []),

    formatPlanPrice: useCallback((planId: string) => {
      const id = planId.replace('price_', '')
      const plan = PlanManager.getPlan(id)
      return plan ? PlanManager.formatPrice(plan) : 'Unknown'
    }, []),

    getSavingsText: useCallback((planId: string) => {
      const id = planId.replace('price_', '')
      return PlanManager.getSavingsText(id)
    }, [])
  }
}