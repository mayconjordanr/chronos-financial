import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  tenantId: z.string().optional(),
})

export const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['checking', 'savings', 'credit', 'investment']),
  institution: z.string().min(1, 'Institution is required'),
  account_number: z.string().min(1, 'Account number is required'),
  balance: z.number().min(0, 'Balance must be positive'),
  currency: z.string().default('USD'),
})

export const transactionSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  category_id: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['income', 'expense', 'transfer']),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Please enter a valid hex color'),
  icon: z.string().optional(),
  parent_id: z.string().optional(),
  type: z.enum(['income', 'expense']),
})

export const cardSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  name: z.string().min(1, 'Card name is required'),
  last_four: z.string().length(4, 'Last four digits must be exactly 4 characters'),
  type: z.enum(['debit', 'credit']),
  brand: z.enum(['visa', 'mastercard', 'amex', 'discover']),
  expires_at: z.string().min(1, 'Expiration date is required'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type VerifyTokenFormData = z.infer<typeof verifyTokenSchema>
export type AccountFormData = z.infer<typeof accountSchema>
export type TransactionFormData = z.infer<typeof transactionSchema>
export type CategoryFormData = z.infer<typeof categorySchema>
export type CardFormData = z.infer<typeof cardSchema>