import { z } from 'zod'

// Account types enum
export const AccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT: 'credit',
  INVESTMENT: 'investment'
} as const

export type AccountTypeValue = typeof AccountType[keyof typeof AccountType]

// Account validation schema
export const accountSchema = z.object({
  name: z.string()
    .min(2, 'Account name must be at least 2 characters')
    .max(50, 'Account name must be less than 50 characters'),
  type: z.enum([AccountType.CHECKING, AccountType.SAVINGS, AccountType.CREDIT, AccountType.INVESTMENT]),
  balance: z.number()
    .refine((val) => {
      // Allow negative balances for credit accounts
      return !isNaN(val)
    }, 'Balance must be a valid number'),
  bank: z.string()
    .min(1, 'Bank is required')
    .max(100, 'Bank name must be less than 100 characters'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional()
})

// Schema for creating account
export const createAccountSchema = accountSchema

// Schema for updating account
export const updateAccountSchema = accountSchema.partial().extend({
  id: z.string().min(1, 'Account ID is required')
})

// Account type definitions
export interface Account {
  id: string
  name: string
  type: AccountTypeValue
  balance: number
  bank: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

// Form data types
export type AccountFormData = z.infer<typeof accountSchema>
export type CreateAccountData = z.infer<typeof createAccountSchema>
export type UpdateAccountData = z.infer<typeof updateAccountSchema>

// Account type metadata for UI
export const accountTypeMetadata = {
  [AccountType.CHECKING]: {
    label: 'Checking',
    icon: 'Building2',
    description: 'Everyday spending account',
    color: 'bg-blue-500'
  },
  [AccountType.SAVINGS]: {
    label: 'Savings',
    icon: 'PiggyBank',
    description: 'Long-term savings account',
    color: 'bg-green-500'
  },
  [AccountType.CREDIT]: {
    label: 'Credit',
    icon: 'CreditCard',
    description: 'Credit card or line of credit',
    color: 'bg-red-500'
  },
  [AccountType.INVESTMENT]: {
    label: 'Investment',
    icon: 'TrendingUp',
    description: 'Investment or brokerage account',
    color: 'bg-purple-500'
  }
} as const

// Common bank names for dropdown
export const commonBanks = [
  'Chase Bank',
  'Bank of America',
  'Wells Fargo',
  'Citibank',
  'U.S. Bank',
  'PNC Bank',
  'Capital One',
  'TD Bank',
  'BMO Harris Bank',
  'HSBC Bank',
  'Other'
] as const