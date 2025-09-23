import { z } from 'zod'

// Card network types
export const cardNetworks = ['visa', 'mastercard', 'amex', 'discover'] as const
export type CardNetwork = typeof cardNetworks[number]

// Card types
export const cardTypes = ['credit', 'debit'] as const
export type CardType = typeof cardTypes[number]

// Helper function to validate future dates
const isFutureDate = (dateString: string) => {
  const [year, month] = dateString.split('-').map(Number)
  const expiry = new Date(year, month - 1) // month - 1 because Date months are 0-indexed
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth())
  return expiry >= currentMonth
}

// Enhanced card schema with comprehensive validation
export const cardSchema = z.object({
  name: z
    .string()
    .min(2, 'Card name must be at least 2 characters')
    .max(50, 'Card name must be less than 50 characters')
    .trim(),

  last4digits: z
    .string()
    .length(4, 'Last 4 digits must be exactly 4 characters')
    .regex(/^\d{4}$/, 'Last 4 digits must contain only numbers'),

  type: z.enum(cardTypes, {
    required_error: 'Please select a card type',
  }),

  network: z.enum(cardNetworks, {
    required_error: 'Please select a card network',
  }),

  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Expiry date must be in YYYY-MM format')
    .refine(isFutureDate, {
      message: 'Expiry date must be in the future',
    }),

  bank: z
    .string()
    .min(2, 'Bank name must be at least 2 characters')
    .max(50, 'Bank name must be less than 50 characters')
    .trim(),

  creditLimit: z
    .number()
    .positive('Credit limit must be a positive number')
    .max(1000000, 'Credit limit cannot exceed $1,000,000')
    .optional(),

  isPrimary: z.boolean().default(false),

  accountId: z.string().optional(), // For linking to specific accounts
})

// Schema for card creation (excludes some fields that might be auto-generated)
export const createCardSchema = cardSchema.omit({ isPrimary: true })

// Schema for card editing (all fields optional except id)
export const updateCardSchema = cardSchema.partial().extend({
  id: z.string().min(1, 'Card ID is required'),
})

// Conditional validation based on card type
export const cardSchemaWithConditionals = cardSchema.superRefine((data, ctx) => {
  // Credit limit is required for credit cards
  if (data.type === 'credit') {
    if (!data.creditLimit || data.creditLimit <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Credit limit is required for credit cards',
        path: ['creditLimit'],
      })
    }
  }

  // Credit limit should not be set for debit cards
  if (data.type === 'debit' && data.creditLimit) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Credit limit should not be set for debit cards',
      path: ['creditLimit'],
    })
  }
})

// Form data types
export type CardFormData = z.infer<typeof cardSchema>
export type CreateCardData = z.infer<typeof createCardSchema>
export type UpdateCardData = z.infer<typeof updateCardSchema>

// Card data type for display
export interface Card extends CardFormData {
  id: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

// Validation utilities
export const validateCardNumber = (last4: string): boolean => {
  return /^\d{4}$/.test(last4)
}

export const validateExpiryDate = (expiryDate: string): boolean => {
  const regex = /^\d{4}-\d{2}$/
  if (!regex.test(expiryDate)) return false
  return isFutureDate(expiryDate)
}