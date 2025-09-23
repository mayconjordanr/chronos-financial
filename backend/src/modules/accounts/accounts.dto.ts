import { z } from 'zod';
import { AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Supported currencies
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'BRL'
] as const;

// Account type validation
const AccountTypeSchema = z.nativeEnum(AccountType);

// Custom Decimal validation
const DecimalSchema = z.union([
  z.number().transform(val => new Decimal(val)),
  z.string().transform(val => new Decimal(val)),
  z.instanceof(Decimal)
]).refine(val => {
  try {
    const decimal = val instanceof Decimal ? val : new Decimal(val);
    return decimal.greaterThanOrEqualTo(new Decimal('-999999999999.99')) &&
           decimal.lessThanOrEqualTo(new Decimal('999999999999.99'));
  } catch {
    return false;
  }
}, {
  message: 'Invalid decimal value or value out of range'
});

// Create Account DTOs
export const CreateAccountSchema = z.object({
  name: z.string()
    .min(1, 'Account name is required')
    .max(255, 'Account name is too long')
    .transform(val => val.trim()),

  type: AccountTypeSchema,

  balance: DecimalSchema.optional().default(new Decimal('0')),

  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .transform(val => val.toUpperCase())
    .refine(val => SUPPORTED_CURRENCIES.includes(val as any), {
      message: 'Unsupported currency'
    })
    .optional()
    .default('USD'),

  description: z.string()
    .max(500, 'Description is too long (max 500 characters)')
    .transform(val => val.trim())
    .optional(),

  bankName: z.string()
    .max(100, 'Bank name is too long')
    .transform(val => val.trim())
    .optional(),

  accountNumber: z.string()
    .max(50, 'Account number is too long')
    .transform(val => val.trim())
    .optional(),

  routingNumber: z.string()
    .max(20, 'Routing number is too long')
    .transform(val => val.trim())
    .optional()
});

export const CreateAccountBodySchema = CreateAccountSchema;

export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;

// Update Account DTOs
export const UpdateAccountSchema = z.object({
  name: z.string()
    .min(1, 'Account name cannot be empty')
    .max(255, 'Account name is too long')
    .transform(val => val.trim())
    .optional(),

  description: z.string()
    .max(500, 'Description is too long (max 500 characters)')
    .transform(val => val.trim())
    .optional(),

  bankName: z.string()
    .max(100, 'Bank name is too long')
    .transform(val => val.trim())
    .optional(),

  accountNumber: z.string()
    .max(50, 'Account number is too long')
    .transform(val => val.trim())
    .optional(),

  routingNumber: z.string()
    .max(20, 'Routing number is too long')
    .transform(val => val.trim())
    .optional()
}).refine(data => {
  // At least one field must be provided
  return Object.keys(data).length > 0;
}, {
  message: 'At least one field must be provided for update'
});

export const UpdateAccountBodySchema = UpdateAccountSchema;

export type UpdateAccountDto = z.infer<typeof UpdateAccountSchema>;

// Update Balance DTOs
export const UpdateBalanceSchema = z.object({
  amount: DecimalSchema.refine(val => {
    return !val.equals(new Decimal('0'));
  }, {
    message: 'Amount cannot be zero'
  }),

  description: z.string()
    .max(255, 'Description is too long')
    .transform(val => val.trim())
    .optional()
});

export const UpdateBalanceBodySchema = UpdateBalanceSchema;

export type UpdateBalanceDto = z.infer<typeof UpdateBalanceSchema>;

// Query Parameter DTOs
export const AccountFiltersSchema = z.object({
  type: AccountTypeSchema.optional(),

  isActive: z.union([
    z.boolean(),
    z.string().transform(val => val.toLowerCase() === 'true')
  ]).optional(),

  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .transform(val => val.toUpperCase())
    .refine(val => SUPPORTED_CURRENCIES.includes(val as any), {
      message: 'Unsupported currency'
    })
    .optional(),

  search: z.string()
    .min(1, 'Search term cannot be empty')
    .max(100, 'Search term is too long')
    .transform(val => val.trim())
    .optional()
});

export type AccountFiltersDto = z.infer<typeof AccountFiltersSchema>;

export const PaginationSchema = z.object({
  page: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val, 10))
  ]).refine(val => val > 0 && val <= 1000, {
    message: 'Page must be between 1 and 1000'
  }).optional().default(1),

  limit: z.union([
    z.number().int().positive(),
    z.string().transform(val => parseInt(val, 10))
  ]).refine(val => val > 0 && val <= 100, {
    message: 'Limit must be between 1 and 100'
  }).optional().default(50),

  sortBy: z.enum(['name', 'balance', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),

  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc')
});

export type PaginationDto = z.infer<typeof PaginationSchema>;

// Route Parameter DTOs
export const AccountParamsSchema = z.object({
  accountId: z.string()
    .min(1, 'Account ID is required')
    .max(50, 'Account ID is invalid')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Account ID contains invalid characters')
});

export type AccountParamsDto = z.infer<typeof AccountParamsSchema>;

// Combined Query DTOs for GET endpoints
export const GetAccountsQuerySchema = AccountFiltersSchema.merge(PaginationSchema);
export type GetAccountsQueryDto = z.infer<typeof GetAccountsQuerySchema>;

export const GetBalanceHistoryQuerySchema = PaginationSchema;
export type GetBalanceHistoryQueryDto = z.infer<typeof GetBalanceHistoryQuerySchema>;

// Response DTOs (for OpenAPI documentation)
export const AccountResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  name: z.string(),
  type: AccountTypeSchema,
  subtype: z.string().nullable(),
  balance: z.union([z.number(), z.string(), z.instanceof(Decimal)]),
  currency: z.string(),
  isActive: z.boolean(),
  description: z.string().nullable(),
  bankName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  routingNumber: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type AccountResponseDto = z.infer<typeof AccountResponseSchema>;

export const AccountListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  accounts: z.array(AccountResponseSchema),
  total: z.number().optional()
});

export type AccountListResponseDto = z.infer<typeof AccountListResponseSchema>;

export const AccountSingleResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  account: AccountResponseSchema.optional()
});

export type AccountSingleResponseDto = z.infer<typeof AccountSingleResponseSchema>;

export const BalanceHistoryItemSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  tenantId: z.string(),
  previousBalance: z.union([z.number(), z.string(), z.instanceof(Decimal)]),
  newBalance: z.union([z.number(), z.string(), z.instanceof(Decimal)]),
  change: z.union([z.number(), z.string(), z.instanceof(Decimal)]),
  description: z.string().optional(),
  timestamp: z.date()
});

export type BalanceHistoryItemDto = z.infer<typeof BalanceHistoryItemSchema>;

export const BalanceHistoryResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  history: z.array(BalanceHistoryItemSchema).optional()
});

export type BalanceHistoryResponseDto = z.infer<typeof BalanceHistoryResponseSchema>;

export const AccountSummaryResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  summary: z.object({
    totalAccounts: z.number(),
    activeAccounts: z.number(),
    totalBalance: z.union([z.number(), z.string(), z.instanceof(Decimal)]),
    balanceByType: z.record(z.union([z.number(), z.string(), z.instanceof(Decimal)])),
    balanceByCurrency: z.record(z.union([z.number(), z.string(), z.instanceof(Decimal)]))
  }).optional()
});

export type AccountSummaryResponseDto = z.infer<typeof AccountSummaryResponseSchema>;

// Error Response DTOs
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(z.string()).optional(),
  code: z.string().optional()
});

export type ErrorResponseDto = z.infer<typeof ErrorResponseSchema>;

// Validation Error Response
export const ValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string().optional()
  }))
});

export type ValidationErrorResponseDto = z.infer<typeof ValidationErrorResponseSchema>;

// Tenant context validation (for middleware)
export const TenantContextSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  userRole: z.string().optional(),
  userEmail: z.string().email().optional()
});

export type TenantContextDto = z.infer<typeof TenantContextSchema>;

// OpenAPI Schema definitions for documentation
export const OpenAPISchemas = {
  CreateAccountRequest: {
    type: 'object',
    required: ['name', 'type'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Account name',
        example: 'Primary Checking Account'
      },
      type: {
        type: 'string',
        enum: Object.values(AccountType),
        description: 'Account type',
        example: 'CHECKING'
      },
      balance: {
        type: 'number',
        format: 'decimal',
        description: 'Initial balance',
        example: 1000.00,
        default: 0
      },
      currency: {
        type: 'string',
        length: 3,
        description: 'Currency code',
        example: 'USD',
        default: 'USD'
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Account description',
        example: 'Main checking account for daily transactions'
      },
      bankName: {
        type: 'string',
        maxLength: 100,
        description: 'Bank name',
        example: 'Chase Bank'
      },
      accountNumber: {
        type: 'string',
        maxLength: 50,
        description: 'Account number',
        example: '****1234'
      },
      routingNumber: {
        type: 'string',
        maxLength: 20,
        description: 'Routing number',
        example: '123456789'
      }
    }
  },

  UpdateAccountRequest: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        description: 'Account name',
        example: 'Updated Account Name'
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Account description'
      },
      bankName: {
        type: 'string',
        maxLength: 100,
        description: 'Bank name'
      },
      accountNumber: {
        type: 'string',
        maxLength: 50,
        description: 'Account number'
      },
      routingNumber: {
        type: 'string',
        maxLength: 20,
        description: 'Routing number'
      }
    }
  },

  UpdateBalanceRequest: {
    type: 'object',
    required: ['amount'],
    properties: {
      amount: {
        type: 'number',
        format: 'decimal',
        description: 'Amount to add/subtract from balance',
        example: 500.00
      },
      description: {
        type: 'string',
        maxLength: 255,
        description: 'Description of balance change',
        example: 'Manual balance adjustment'
      }
    }
  },

  AccountResponse: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'acc_123456789' },
      tenantId: { type: 'string', example: 'tenant_123' },
      userId: { type: 'string', example: 'user_123' },
      name: { type: 'string', example: 'Primary Checking' },
      type: { type: 'string', enum: Object.values(AccountType), example: 'CHECKING' },
      subtype: { type: 'string', nullable: true, example: null },
      balance: { type: 'number', format: 'decimal', example: 1500.00 },
      currency: { type: 'string', example: 'USD' },
      isActive: { type: 'boolean', example: true },
      description: { type: 'string', nullable: true, example: 'Main checking account' },
      bankName: { type: 'string', nullable: true, example: 'Chase Bank' },
      accountNumber: { type: 'string', nullable: true, example: '****1234' },
      routingNumber: { type: 'string', nullable: true, example: '123456789' },
      createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:00:00Z' },
      updatedAt: { type: 'string', format: 'date-time', example: '2024-01-20T15:30:00Z' }
    }
  }
} as const;