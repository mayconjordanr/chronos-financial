import { z } from 'zod'

export const transactionFormSchema = z.object({
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description must be less than 255 characters'),

  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places')
    .max(999999.99, 'Amount cannot exceed $999,999.99'),

  type: z.enum(['income', 'expense', 'transfer'], {
    required_error: 'Transaction type is required',
  }),

  account_id: z
    .string()
    .min(1, 'Account is required'),

  category_id: z
    .string()
    .optional(),

  date: z
    .string()
    .min(1, 'Date is required')
    .refine((date) => {
      const selectedDate = new Date(date)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today
      return selectedDate <= today
    }, 'Date cannot be in the future'),

  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
})

// For transfer transactions, we need additional validation
export const transferFormSchema = transactionFormSchema.extend({
  to_account_id: z
    .string()
    .min(1, 'Destination account is required'),
}).refine(
  (data) => data.account_id !== data.to_account_id,
  {
    message: 'Source and destination accounts must be different',
    path: ['to_account_id'],
  }
)

// Create form data types
export type TransactionFormData = z.infer<typeof transactionFormSchema>
export type TransferFormData = z.infer<typeof transferFormSchema>

// Utility function to get the appropriate schema based on transaction type
export function getTransactionSchema(type: 'income' | 'expense' | 'transfer') {
  return type === 'transfer' ? transferFormSchema : transactionFormSchema
}

// Default form values
export const defaultTransactionValues: Partial<TransactionFormData> = {
  type: 'expense',
  date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  notes: '',
}