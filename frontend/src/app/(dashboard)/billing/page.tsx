'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard,
  Check,
  Star,
  Zap,
  Crown,
  Calendar,
  Users,
  BarChart3,
  Shield,
  Clock,
  Download,
  Settings,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'monthly' | 'yearly'
  features: string[]
  limits: {
    transactions: number
    accounts: number
    categories: number
    reports: number
    whatsapp: boolean
    api: boolean
  }
  popular?: boolean
}

interface CurrentSubscription {
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd: string
  trialEnd?: string
  cancelAtPeriodEnd: boolean
}

interface UsageStats {
  transactions: { used: number; limit: number }
  accounts: { used: number; limit: number }
  categories: { used: number; limit: number }
  reports: { used: number; limit: number }
}

const plans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals getting started',
    price: 0,
    interval: 'monthly',
    features: [
      'Up to 100 transactions/month',
      '3 bank accounts',
      '10 categories',
      'Basic reports',
      'Email support'
    ],
    limits: {
      transactions: 100,
      accounts: 3,
      categories: 10,
      reports: 5,
      whatsapp: false,
      api: false
    }
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    description: 'For power users and small businesses',
    price: 29,
    interval: 'monthly',
    features: [
      'Unlimited transactions',
      'Unlimited accounts',
      'Unlimited categories',
      'Advanced reports & analytics',
      'WhatsApp integration',
      'API access',
      'Priority support',
      'Data export'
    ],
    limits: {
      transactions: -1, // unlimited
      accounts: -1,
      categories: -1,
      reports: -1,
      whatsapp: true,
      api: true
    },
    popular: true
  },
  {
    id: 'pro_yearly',
    name: 'Pro (Annual)',
    description: 'Save 20% with annual billing',
    price: 278, // 29 * 12 * 0.8
    interval: 'yearly',
    features: [
      'Everything in Pro',
      '2 months free',
      'Annual reporting',
      'Dedicated account manager'
    ],
    limits: {
      transactions: -1,
      accounts: -1,
      categories: -1,
      reports: -1,
      whatsapp: true,
      api: true
    }
  }
]

export default function BillingPage() {
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  // Mock data for development
  useEffect(() => {
    // Simulate loading subscription data
    setTimeout(() => {
      setCurrentSubscription({
        planId: 'starter',
        status: 'trialing',
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false
      })

      setUsage({
        transactions: { used: 47, limit: 100 },
        accounts: { used: 2, limit: 3 },
        categories: { used: 8, limit: 10 },
        reports: { used: 3, limit: 5 }
      })
    }, 1000)
  }, [])

  const handleUpgrade = async (planId: string) => {
    setIsLoading(true)
    try {
      // Simulate Stripe checkout
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Redirecting to Stripe checkout...')
      // In real implementation, redirect to Stripe Checkout
    } catch (error) {
      toast.error('Failed to start checkout process')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setCurrentSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: true } : null)
      toast.success('Subscription will be canceled at the end of the current period')
    } catch (error) {
      toast.error('Failed to cancel subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setCurrentSubscription(prev => prev ? { ...prev, cancelAtPeriodEnd: false } : null)
      toast.success('Subscription reactivated')
    } catch (error) {
      toast.error('Failed to reactivate subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const currentPlan = plans.find(plan => plan.id === currentSubscription?.planId)
  const filteredPlans = plans.filter(plan => 
    plan.interval === billingInterval || plan.id === 'starter'
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>
      case 'trialing':
        return <Badge variant="secondary">Trial</Badge>
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getUsageColor = (used: number, limit: number) => {
    if (limit === -1) return 'text-green-600' // unlimited
    const percentage = (used / limit) * 100
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min((used / limit) * 100, 100)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-8 w-8" />
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground">
          Manage your subscription, billing, and usage.
        </p>
      </motion.div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Current Subscription */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentSubscription ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{currentPlan?.name || 'Unknown Plan'}</span>
                      {getStatusBadge(currentSubscription.status)}
                    </div>
                    
                    {currentSubscription.status === 'trialing' && currentSubscription.trialEnd && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Trial Period</span>
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          Trial ends on {new Date(currentSubscription.trialEnd).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Billing cycle</span>
                        <span>{currentPlan?.interval || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Next billing date</span>
                        <span>{new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</span>
                      </div>
                      {currentPlan && currentPlan.price > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Amount</span>
                          <span>${currentPlan.price}/{currentPlan.interval === 'monthly' ? 'mo' : 'year'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {currentSubscription.cancelAtPeriodEnd ? (
                        <Button onClick={handleReactivateSubscription} disabled={isLoading} className="flex-1">
                          Reactivate
                        </Button>
                      ) : (
                        currentPlan?.id !== 'starter' && (
                          <Button 
                            onClick={handleCancelSubscription} 
                            disabled={isLoading} 
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel Subscription
                          </Button>
                        )
                      )}
                      
                      {currentPlan?.id === 'starter' && (
                        <Button onClick={() => handleUpgrade('pro_monthly')} disabled={isLoading} className="flex-1">
                          Upgrade to Pro
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Loading subscription details...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Usage This Month
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {usage ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Transactions</span>
                        <span className={getUsageColor(usage.transactions.used, usage.transactions.limit)}>
                          {usage.transactions.used}
                          {usage.transactions.limit > 0 ? `/${usage.transactions.limit}` : ' (unlimited)'}
                        </span>
                      </div>
                      {usage.transactions.limit > 0 && (
                        <Progress value={getUsagePercentage(usage.transactions.used, usage.transactions.limit)} className="h-2" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accounts</span>
                        <span className={getUsageColor(usage.accounts.used, usage.accounts.limit)}>
                          {usage.accounts.used}
                          {usage.accounts.limit > 0 ? `/${usage.accounts.limit}` : ' (unlimited)'}
                        </span>
                      </div>
                      {usage.accounts.limit > 0 && (
                        <Progress value={getUsagePercentage(usage.accounts.used, usage.accounts.limit)} className="h-2" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Categories</span>
                        <span className={getUsageColor(usage.categories.used, usage.categories.limit)}>
                          {usage.categories.used}
                          {usage.categories.limit > 0 ? `/${usage.categories.limit}` : ' (unlimited)'}
                        </span>
                      </div>
                      {usage.categories.limit > 0 && (
                        <Progress value={getUsagePercentage(usage.categories.used, usage.categories.limit)} className="h-2" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Reports Generated</span>
                        <span className={getUsageColor(usage.reports.used, usage.reports.limit)}>
                          {usage.reports.used}
                          {usage.reports.limit > 0 ? `/${usage.reports.limit}` : ' (unlimited)'}
                        </span>
                      </div>
                      {usage.reports.limit > 0 && (
                        <Progress value={getUsagePercentage(usage.reports.used, usage.reports.limit)} className="h-2" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Loading usage data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Billing History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Trial Period</p>
                    <p className="text-sm text-muted-foreground">Started Dec 1, 2024</p>
                  </div>
                  <Badge variant="secondary">Free Trial</Badge>
                </div>
                
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No billing history yet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={billingInterval === 'monthly' ? 'default' : 'outline'}
              onClick={() => setBillingInterval('monthly')}
              size="sm"
            >
              Monthly
            </Button>
            <Button
              variant={billingInterval === 'yearly' ? 'default' : 'outline'}
              onClick={() => setBillingInterval('yearly')}
              size="sm"
            >
              Yearly
              <Badge variant="secondary" className="ml-2">Save 20%</Badge>
            </Button>
          </div>

          {/* Plans Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {filteredPlans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <Card className={`h-full ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      {plan.id === 'starter' ? (
                        <Zap className="h-5 w-5" />
                      ) : (
                        <Crown className="h-5 w-5" />
                      )}
                      {plan.name}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        ${plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">/{plan.interval === 'monthly' ? 'mo' : 'year'}</span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full" 
                      disabled={isLoading || currentSubscription?.planId === plan.id}
                      onClick={() => handleUpgrade(plan.id)}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {currentSubscription?.planId === plan.id ? 'Current Plan' : 
                       plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Features Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Feature</th>
                      <th className="text-center py-2">Starter</th>
                      <th className="text-center py-2">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    <tr className="border-b">
                      <td className="py-2">Monthly Transactions</td>
                      <td className="text-center py-2">100</td>
                      <td className="text-center py-2">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Bank Accounts</td>
                      <td className="text-center py-2">3</td>
                      <td className="text-center py-2">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Categories</td>
                      <td className="text-center py-2">10</td>
                      <td className="text-center py-2">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">WhatsApp Integration</td>
                      <td className="text-center py-2">❌</td>
                      <td className="text-center py-2">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">API Access</td>
                      <td className="text-center py-2">❌</td>
                      <td className="text-center py-2">✅</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Priority Support</td>
                      <td className="text-center py-2">❌</td>
                      <td className="text-center py-2">✅</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Detailed Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Current Usage</CardTitle>
                <CardDescription>
                  Your usage for the current billing period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {usage && (
                  <div className="space-y-4">
                    {Object.entries(usage).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="capitalize font-medium">{key}</span>
                          <span className={getUsageColor(value.used, value.limit)}>
                            {value.used}{value.limit > 0 ? `/${value.limit}` : ' (unlimited)'}
                          </span>
                        </div>
                        {value.limit > 0 && (
                          <div className="space-y-1">
                            <Progress value={getUsagePercentage(value.used, value.limit)} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0</span>
                              <span>{value.limit}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Warnings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Usage Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {usage && usage.transactions.limit > 0 && usage.transactions.used / usage.transactions.limit > 0.8 && (
                  <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Transaction Limit Warning</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      You've used {Math.round((usage.transactions.used / usage.transactions.limit) * 100)}% of your monthly transaction limit.
                    </p>
                  </div>
                )}

                <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">All Good!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your usage is within normal limits.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage History Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Track your usage over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Usage chart coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}