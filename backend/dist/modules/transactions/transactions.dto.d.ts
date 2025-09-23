import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
export declare const createTransactionSchema: z.ZodEffects<z.ZodObject<{
    accountId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    toAccountId: z.ZodOptional<z.ZodString>;
    amount: z.ZodEffects<z.ZodNumber, Decimal, number>;
    type: z.ZodNativeEnum<{
        INCOME: "INCOME";
        EXPENSE: "EXPENSE";
        TRANSFER: "TRANSFER";
    }>;
    description: z.ZodString;
    date: z.ZodEffects<z.ZodOptional<z.ZodString>, Date | undefined, string | undefined>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: Decimal;
    date?: Date | undefined;
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: number;
    date?: string | undefined;
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: Decimal;
    date?: Date | undefined;
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: number;
    date?: string | undefined;
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const updateTransactionSchema: z.ZodObject<{
    categoryId: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodEffects<z.ZodNumber, Decimal, number>>;
    description: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    date?: Date | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
    categoryId?: string | undefined;
    amount?: Decimal | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    date?: string | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
    categoryId?: string | undefined;
    amount?: number | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const getTransactionsSchema: z.ZodObject<{
    accountId: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodNativeEnum<{
        INCOME: "INCOME";
        EXPENSE: "EXPENSE";
        TRANSFER: "TRANSFER";
    }>>;
    startDate: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    endDate: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    minAmount: z.ZodOptional<z.ZodEffects<z.ZodNumber, Decimal, number>>;
    maxAmount: z.ZodOptional<z.ZodEffects<z.ZodNumber, Decimal, number>>;
    search: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodEnum<["date", "amount", "description"]>>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    type?: "INCOME" | "EXPENSE" | "TRANSFER" | undefined;
    search?: string | undefined;
    tags?: string[] | undefined;
    accountId?: string | undefined;
    categoryId?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    minAmount?: Decimal | undefined;
    maxAmount?: Decimal | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "date" | "description" | "amount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}, {
    type?: "INCOME" | "EXPENSE" | "TRANSFER" | undefined;
    search?: string | undefined;
    tags?: string[] | undefined;
    accountId?: string | undefined;
    categoryId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    minAmount?: number | undefined;
    maxAmount?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: "date" | "description" | "amount" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const createRecurringTransactionSchema: z.ZodEffects<z.ZodObject<{
    accountId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodString>;
    toAccountId: z.ZodOptional<z.ZodString>;
    amount: z.ZodEffects<z.ZodNumber, Decimal, number>;
    type: z.ZodNativeEnum<{
        INCOME: "INCOME";
        EXPENSE: "EXPENSE";
        TRANSFER: "TRANSFER";
    }>;
    description: z.ZodString;
    frequency: z.ZodEnum<["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]>;
    startDate: z.ZodEffects<z.ZodString, Date, string>;
    endDate: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: Decimal;
    startDate: Date;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    endDate?: Date | undefined;
}, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: number;
    startDate: string;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    endDate?: string | undefined;
}>, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: Decimal;
    startDate: Date;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    endDate?: Date | undefined;
}, {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    description: string;
    accountId: string;
    amount: number;
    startDate: string;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
    tags?: string[] | undefined;
    categoryId?: string | undefined;
    toAccountId?: string | undefined;
    metadata?: Record<string, any> | undefined;
    endDate?: string | undefined;
}>;
export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;
export type GetTransactionsRequest = z.infer<typeof getTransactionsSchema>;
export type CreateRecurringTransactionRequest = z.infer<typeof createRecurringTransactionSchema>;
//# sourceMappingURL=transactions.dto.d.ts.map