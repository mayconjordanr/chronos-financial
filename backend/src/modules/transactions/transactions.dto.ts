import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const createTransactionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  toAccountId: z.string().uuid('Invalid destination account ID').optional(),
  amount: z.number().positive('Amount must be positive').transform(val => new Decimal(val)),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: 'Type must be INCOME, EXPENSE, or TRANSFER' })
  }),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  date: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
}).refine(
  (data) => {
    // If type is TRANSFER, toAccountId is required
    if (data.type === TransactionType.TRANSFER && !data.toAccountId) {
      return false;
    }
    return true;
  },
  {
    message: 'Transfer transactions require a destination account',
    path: ['toAccountId']
  }
);

export const updateTransactionSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional(),
  amount: z.number().positive('Amount must be positive').transform(val => new Decimal(val)).optional(),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long').optional(),
  date: z.string().datetime().transform(val => new Date(val)).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const getTransactionsSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  startDate: z.string().datetime().transform(val => new Date(val)).optional(),
  endDate: z.string().datetime().transform(val => new Date(val)).optional(),
  minAmount: z.number().transform(val => new Decimal(val)).optional(),
  maxAmount: z.number().transform(val => new Decimal(val)).optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['date', 'amount', 'description']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const createRecurringTransactionSchema = z.object({
  accountId: z.string().uuid('Invalid account ID'),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  toAccountId: z.string().uuid('Invalid destination account ID').optional(),
  amount: z.number().positive('Amount must be positive').transform(val => new Decimal(val)),
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: 'Type must be INCOME, EXPENSE, or TRANSFER' })
  }),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
    errorMap: () => ({ message: 'Frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY' })
  }),
  startDate: z.string().datetime().transform(val => new Date(val)),
  endDate: z.string().datetime().transform(val => new Date(val)).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
}).refine(
  (data) => {
    // If type is TRANSFER, toAccountId is required
    if (data.type === TransactionType.TRANSFER && !data.toAccountId) {
      return false;
    }
    // End date must be after start date if provided
    if (data.endDate && data.endDate <= data.startDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Invalid recurring transaction configuration',
  }
);

export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;
export type GetTransactionsRequest = z.infer<typeof getTransactionsSchema>;
export type CreateRecurringTransactionRequest = z.infer<typeof createRecurringTransactionSchema>;