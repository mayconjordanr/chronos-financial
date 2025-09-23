"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRecurringTransactionSchema = exports.getTransactionsSchema = exports.updateTransactionSchema = exports.createTransactionSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
exports.createTransactionSchema = zod_1.z.object({
    accountId: zod_1.z.string().uuid('Invalid account ID'),
    categoryId: zod_1.z.string().uuid('Invalid category ID').optional(),
    toAccountId: zod_1.z.string().uuid('Invalid destination account ID').optional(),
    amount: zod_1.z.number().positive('Amount must be positive').transform(val => new library_1.Decimal(val)),
    type: zod_1.z.nativeEnum(client_1.TransactionType, {
        errorMap: () => ({ message: 'Type must be INCOME, EXPENSE, or TRANSFER' })
    }),
    description: zod_1.z.string().min(1, 'Description is required').max(500, 'Description too long'),
    date: zod_1.z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
}).refine((data) => {
    if (data.type === client_1.TransactionType.TRANSFER && !data.toAccountId) {
        return false;
    }
    return true;
}, {
    message: 'Transfer transactions require a destination account',
    path: ['toAccountId']
});
exports.updateTransactionSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid('Invalid category ID').optional(),
    amount: zod_1.z.number().positive('Amount must be positive').transform(val => new library_1.Decimal(val)).optional(),
    description: zod_1.z.string().min(1, 'Description is required').max(500, 'Description too long').optional(),
    date: zod_1.z.string().datetime().transform(val => new Date(val)).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.getTransactionsSchema = zod_1.z.object({
    accountId: zod_1.z.string().uuid().optional(),
    categoryId: zod_1.z.string().uuid().optional(),
    type: zod_1.z.nativeEnum(client_1.TransactionType).optional(),
    startDate: zod_1.z.string().datetime().transform(val => new Date(val)).optional(),
    endDate: zod_1.z.string().datetime().transform(val => new Date(val)).optional(),
    minAmount: zod_1.z.number().transform(val => new library_1.Decimal(val)).optional(),
    maxAmount: zod_1.z.number().transform(val => new library_1.Decimal(val)).optional(),
    search: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    page: zod_1.z.number().int().min(1).optional(),
    limit: zod_1.z.number().int().min(1).max(100).optional(),
    sortBy: zod_1.z.enum(['date', 'amount', 'description']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional()
});
exports.createRecurringTransactionSchema = zod_1.z.object({
    accountId: zod_1.z.string().uuid('Invalid account ID'),
    categoryId: zod_1.z.string().uuid('Invalid category ID').optional(),
    toAccountId: zod_1.z.string().uuid('Invalid destination account ID').optional(),
    amount: zod_1.z.number().positive('Amount must be positive').transform(val => new library_1.Decimal(val)),
    type: zod_1.z.nativeEnum(client_1.TransactionType, {
        errorMap: () => ({ message: 'Type must be INCOME, EXPENSE, or TRANSFER' })
    }),
    description: zod_1.z.string().min(1, 'Description is required').max(500, 'Description too long'),
    frequency: zod_1.z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
        errorMap: () => ({ message: 'Frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY' })
    }),
    startDate: zod_1.z.string().datetime().transform(val => new Date(val)),
    endDate: zod_1.z.string().datetime().transform(val => new Date(val)).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
}).refine((data) => {
    if (data.type === client_1.TransactionType.TRANSFER && !data.toAccountId) {
        return false;
    }
    if (data.endDate && data.endDate <= data.startDate) {
        return false;
    }
    return true;
}, {
    message: 'Invalid recurring transaction configuration',
});
//# sourceMappingURL=transactions.dto.js.map