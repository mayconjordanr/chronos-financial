import { UsageLimits, UsageStats } from '../hooks/use-usage-tracking'

export interface Plan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  limits: UsageLimits
  features: string[]
  popular?: boolean
  trialDays?: number
}

export const PLANS: Record<string, Plan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 0,
    currency: 'usd',
    interval: 'month',
    limits: {
      transactions: 100,
      accounts: 3,
      categories: 10,
      reports: 5,
      whatsappMessages: 0,
      apiCalls: 0
    },
    features: [
      '100 transactions/month',
      '3 bank accounts',
      '10 categories',
      'Basic reports',
      'Email support'
    ]
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro (Monthly)',
    price: 2900, // $29.00 in cents
    currency: 'usd',
    interval: 'month',
    limits: {
      transactions: -1, // Unlimited
      accounts: -1,
      categories: -1,
      reports: -1,
      whatsappMessages: -1,
      apiCalls: 10000
    },
    features: [
      'Unlimited transactions',
      'Unlimited accounts',
      'Unlimited categories',
      'Advanced reports',
      'WhatsApp integration',
      'API access (10k/month)',
      'Priority support'
    ],
    popular: true,
    trialDays: 14
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Pro (Annual)',
    price: 27800, // $278.00 in cents (save 20%)
    currency: 'usd',
    interval: 'year',
    limits: {
      transactions: -1,
      accounts: -1,
      categories: -1,
      reports: -1,
      whatsappMessages: -1,
      apiCalls: 120000 // 120k per year
    },
    features: [
      'Everything in Pro Monthly',
      '2 months free',
      'API access (120k/year)',
      'Annual reporting',
      'Dedicated account manager'
    ],
    trialDays: 14
  }
}

export class PlanManager {
  static getPlan(planId: string): Plan | null {
    return PLANS[planId] || null
  }

  static getAllPlans(): Plan[] {
    return Object.values(PLANS)
  }

  static getPublicPlans(): Plan[] {
    return Object.values(PLANS).filter(plan => plan.id !== 'starter')
  }

  static canUpgrade(currentPlanId: string, targetPlanId: string): boolean {
    const currentPlan = this.getPlan(currentPlanId)
    const targetPlan = this.getPlan(targetPlanId)

    if (!currentPlan || !targetPlan) return false

    // Can always upgrade to a higher tier
    const planHierarchy = ['starter', 'pro_monthly', 'pro_yearly']
    const currentIndex = planHierarchy.indexOf(currentPlanId)
    const targetIndex = planHierarchy.indexOf(targetPlanId)

    return targetIndex > currentIndex
  }

  static canDowngrade(currentPlanId: string, targetPlanId: string): boolean {
    const currentPlan = this.getPlan(currentPlanId)
    const targetPlan = this.getPlan(targetPlanId)

    if (!currentPlan || !targetPlan) return false

    // Can downgrade to a lower tier
    const planHierarchy = ['starter', 'pro_monthly', 'pro_yearly']
    const currentIndex = planHierarchy.indexOf(currentPlanId)
    const targetIndex = planHierarchy.indexOf(targetPlanId)

    return targetIndex < currentIndex
  }

  static checkUsageCompliance(usage: UsageStats, planId: string): {
    compliant: boolean
    violations: string[]
    recommendations: string[]
  } {
    const plan = this.getPlan(planId)
    if (!plan) {
      return {
        compliant: false,
        violations: ['Invalid plan'],
        recommendations: []
      }
    }

    const violations: string[] = []
    const recommendations: string[] = []

    // Check each usage metric against plan limits
    Object.entries(usage).forEach(([resource, used]) => {
      const limit = plan.limits[resource as keyof UsageLimits]

      if (limit === -1) return // Unlimited

      if (used > limit) {
        violations.push(`${resource}: ${used}/${limit} (over limit)`)
        recommendations.push(`Upgrade to Pro for unlimited ${resource.toLowerCase()}`)
      } else if (used > limit * 0.8) {
        recommendations.push(`Consider upgrading - you're using ${Math.round((used / limit) * 100)}% of your ${resource.toLowerCase()} limit`)
      }
    })

    return {
      compliant: violations.length === 0,
      violations,
      recommendations: [...new Set(recommendations)] // Remove duplicates
    }
  }

  static calculateProration(currentPlanId: string, targetPlanId: string, currentPeriodEnd: Date): {
    proratedAmount: number
    description: string
  } {
    const currentPlan = this.getPlan(currentPlanId)
    const targetPlan = this.getPlan(targetPlanId)

    if (!currentPlan || !targetPlan) {
      return { proratedAmount: 0, description: 'Invalid plans' }
    }

    const now = new Date()
    const daysRemaining = Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const totalDaysInPeriod = currentPlan.interval === 'year' ? 365 : 30

    // Calculate prorated amounts
    const currentProratedCredit = (currentPlan.price * daysRemaining) / totalDaysInPeriod
    const targetProratedCharge = (targetPlan.price * daysRemaining) / totalDaysInPeriod

    const proratedAmount = Math.max(0, targetProratedCharge - currentProratedCredit)

    let description = ''
    if (proratedAmount > 0) {
      description = `You'll be charged $${(proratedAmount / 100).toFixed(2)} prorated for the remaining ${daysRemaining} days`
    } else {
      description = `You'll receive a credit of $${Math.abs(proratedAmount / 100).toFixed(2)} for the remaining ${daysRemaining} days`
    }

    return { proratedAmount, description }
  }

  static getTrialInfo(planId: string): {
    hasTrialPeriod: boolean
    trialDays: number
    description: string
  } {
    const plan = this.getPlan(planId)

    if (!plan || !plan.trialDays) {
      return {
        hasTrialPeriod: false,
        trialDays: 0,
        description: 'No trial period available'
      }
    }

    return {
      hasTrialPeriod: true,
      trialDays: plan.trialDays,
      description: `Start your ${plan.trialDays}-day free trial. No payment required until trial ends.`
    }
  }

  static formatPrice(plan: Plan): string {
    if (plan.price === 0) return 'Free'

    const amount = plan.price / 100
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: plan.currency.toUpperCase(),
    }).format(amount)

    return `${formatted}/${plan.interval}`
  }

  static getSavingsText(planId: string): string | null {
    if (planId === 'pro_yearly') {
      const monthlyTotal = PLANS.pro_monthly.price * 12
      const yearlyPrice = PLANS.pro_yearly.price
      const savings = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100

      return `Save ${Math.round(savings)}% vs monthly`
    }

    return null
  }
}