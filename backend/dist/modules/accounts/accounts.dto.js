"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAPISchemas = exports.TenantContextSchema = exports.ValidationErrorResponseSchema = exports.ErrorResponseSchema = exports.AccountSummaryResponseSchema = exports.BalanceHistoryResponseSchema = exports.BalanceHistoryItemSchema = exports.AccountSingleResponseSchema = exports.AccountListResponseSchema = exports.AccountResponseSchema = exports.GetBalanceHistoryQuerySchema = exports.GetAccountsQuerySchema = exports.AccountParamsSchema = exports.PaginationSchema = exports.AccountFiltersSchema = exports.UpdateBalanceBodySchema = exports.UpdateBalanceSchema = exports.UpdateAccountBodySchema = exports.UpdateAccountSchema = exports.CreateAccountBodySchema = exports.CreateAccountSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'BRL'
];
const AccountTypeSchema = zod_1.z.nativeEnum(client_1.AccountType);
const DecimalSchema = zod_1.z.union([
    zod_1.z.number().transform(val => new library_1.Decimal(val)),
    zod_1.z.string().transform(val => new library_1.Decimal(val)),
    zod_1.z.instanceof(library_1.Decimal)
]).refine(val => {
    try {
        const decimal = val instanceof library_1.Decimal ? val : new library_1.Decimal(val);
        return decimal.greaterThanOrEqualTo(new library_1.Decimal('-999999999999.99')) &&
            decimal.lessThanOrEqualTo(new library_1.Decimal('999999999999.99'));
    }
    catch {
        return false;
    }
}, {
    message: 'Invalid decimal value or value out of range'
});
exports.CreateAccountSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Account name is required')
        .max(255, 'Account name is too long')
        .transform(val => val.trim()),
    type: AccountTypeSchema,
    balance: DecimalSchema.optional().default(new library_1.Decimal('0')),
    currency: zod_1.z.string()
        .length(3, 'Currency must be 3 characters')
        .transform(val => val.toUpperCase())
        .refine(val => SUPPORTED_CURRENCIES.includes(val), {
        message: 'Unsupported currency'
    })
        .optional()
        .default('USD'),
    description: zod_1.z.string()
        .max(500, 'Description is too long (max 500 characters)')
        .transform(val => val.trim())
        .optional(),
    bankName: zod_1.z.string()
        .max(100, 'Bank name is too long')
        .transform(val => val.trim())
        .optional(),
    accountNumber: zod_1.z.string()
        .max(50, 'Account number is too long')
        .transform(val => val.trim())
        .optional(),
    routingNumber: zod_1.z.string()
        .max(20, 'Routing number is too long')
        .transform(val => val.trim())
        .optional()
});
exports.CreateAccountBodySchema = exports.CreateAccountSchema;
exports.UpdateAccountSchema = zod_1.z.object({
    name: zod_1.z.string()
        .min(1, 'Account name cannot be empty')
        .max(255, 'Account name is too long')
        .transform(val => val.trim())
        .optional(),
    description: zod_1.z.string()
        .max(500, 'Description is too long (max 500 characters)')
        .transform(val => val.trim())
        .optional(),
    bankName: zod_1.z.string()
        .max(100, 'Bank name is too long')
        .transform(val => val.trim())
        .optional(),
    accountNumber: zod_1.z.string()
        .max(50, 'Account number is too long')
        .transform(val => val.trim())
        .optional(),
    routingNumber: zod_1.z.string()
        .max(20, 'Routing number is too long')
        .transform(val => val.trim())
        .optional()
}).refine(data => {
    return Object.keys(data).length > 0;
}, {
    message: 'At least one field must be provided for update'
});
exports.UpdateAccountBodySchema = exports.UpdateAccountSchema;
exports.UpdateBalanceSchema = zod_1.z.object({
    amount: DecimalSchema.refine(val => {
        return !val.equals(new library_1.Decimal('0'));
    }, {
        message: 'Amount cannot be zero'
    }),
    description: zod_1.z.string()
        .max(255, 'Description is too long')
        .transform(val => val.trim())
        .optional()
});
exports.UpdateBalanceBodySchema = exports.UpdateBalanceSchema;
exports.AccountFiltersSchema = zod_1.z.object({
    type: AccountTypeSchema.optional(),
    isActive: zod_1.z.union([
        zod_1.z.boolean(),
        zod_1.z.string().transform(val => val.toLowerCase() === 'true')
    ]).optional(),
    currency: zod_1.z.string()
        .length(3, 'Currency must be 3 characters')
        .transform(val => val.toUpperCase())
        .refine(val => SUPPORTED_CURRENCIES.includes(val), {
        message: 'Unsupported currency'
    })
        .optional(),
    search: zod_1.z.string()
        .min(1, 'Search term cannot be empty')
        .max(100, 'Search term is too long')
        .transform(val => val.trim())
        .optional()
});
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.union([
        zod_1.z.number().int().positive(),
        zod_1.z.string().transform(val => parseInt(val, 10))
    ]).refine(val => val > 0 && val <= 1000, {
        message: 'Page must be between 1 and 1000'
    }).optional().default(1),
    limit: zod_1.z.union([
        zod_1.z.number().int().positive(),
        zod_1.z.string().transform(val => parseInt(val, 10))
    ]).refine(val => val > 0 && val <= 100, {
        message: 'Limit must be between 1 and 100'
    }).optional().default(50),
    sortBy: zod_1.z.enum(['name', 'balance', 'createdAt', 'updatedAt'])
        .optional()
        .default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc'])
        .optional()
        .default('desc')
});
exports.AccountParamsSchema = zod_1.z.object({
    accountId: zod_1.z.string()
        .min(1, 'Account ID is required')
        .max(50, 'Account ID is invalid')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Account ID contains invalid characters')
});
exports.GetAccountsQuerySchema = exports.AccountFiltersSchema.merge(exports.PaginationSchema);
exports.GetBalanceHistoryQuerySchema = exports.PaginationSchema;
exports.AccountResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    userId: zod_1.z.string(),
    name: zod_1.z.string(),
    type: AccountTypeSchema,
    subtype: zod_1.z.string().nullable(),
    balance: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.instanceof(library_1.Decimal)]),
    currency: zod_1.z.string(),
    isActive: zod_1.z.boolean(),
    description: zod_1.z.string().nullable(),
    bankName: zod_1.z.string().nullable(),
    accountNumber: zod_1.z.string().nullable(),
    routingNumber: zod_1.z.string().nullable(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.AccountListResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    accounts: zod_1.z.array(exports.AccountResponseSchema),
    total: zod_1.z.number().optional()
});
exports.AccountSingleResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    account: exports.AccountResponseSchema.optional()
});
exports.BalanceHistoryItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    accountId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    previousBalance: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.instanceof(library_1.Decimal)]),
    newBalance: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.instanceof(library_1.Decimal)]),
    change: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.instanceof(library_1.Decimal)]),
    description: zod_1.z.string().optional(),
    timestamp: zod_1.z.date()
});
exports.BalanceHistoryResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    history: zod_1.z.array(exports.BalanceHistoryItemSchema).optional()
});
exports.AccountSummaryResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
    summary: zod_1.z.object({
        totalAccounts: zod_1.z.number(),
        activeAccounts: zod_1.z.number(),
        totalBalance: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.instanceof(library_1.Decimal)]),
        balanceByType: zod_1.z.record(zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.instanceof(library_1.Decimal)])),
        balanceByCurrency: zod_1.z.record(zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.instanceof(library_1.Decimal)]))
    }).optional()
});
exports.ErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    message: zod_1.z.string(),
    errors: zod_1.z.array(zod_1.z.string()).optional(),
    code: zod_1.z.string().optional()
});
exports.ValidationErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    message: zod_1.z.string(),
    errors: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        message: zod_1.z.string(),
        code: zod_1.z.string().optional()
    }))
});
exports.TenantContextSchema = zod_1.z.object({
    tenantId: zod_1.z.string().min(1, 'Tenant ID is required'),
    userId: zod_1.z.string().min(1, 'User ID is required'),
    userRole: zod_1.z.string().optional(),
    userEmail: zod_1.z.string().email().optional()
});
exports.OpenAPISchemas = {
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
                enum: Object.values(client_1.AccountType),
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
            type: { type: 'string', enum: Object.values(client_1.AccountType), example: 'CHECKING' },
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
};
//# sourceMappingURL=accounts.dto.js.map