import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
export declare const CreateAccountSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    type: z.ZodNativeEnum<{
        CHECKING: "CHECKING";
        SAVINGS: "SAVINGS";
        CREDIT_CARD: "CREDIT_CARD";
        INVESTMENT: "INVESTMENT";
        LOAN: "LOAN";
        CASH: "CASH";
        OTHER: "OTHER";
    }>;
    balance: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodEffects<z.ZodNumber, Decimal, number>, z.ZodEffects<z.ZodString, Decimal, string>, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>, Decimal, string | number | Decimal>>>;
    currency: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    bankName: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    accountNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    routingNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
    name: string;
    currency: string;
    balance: Decimal;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}, {
    type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
    name: string;
    currency?: string | undefined;
    description?: string | undefined;
    balance?: string | number | Decimal | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}>;
export declare const CreateAccountBodySchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    type: z.ZodNativeEnum<{
        CHECKING: "CHECKING";
        SAVINGS: "SAVINGS";
        CREDIT_CARD: "CREDIT_CARD";
        INVESTMENT: "INVESTMENT";
        LOAN: "LOAN";
        CASH: "CASH";
        OTHER: "OTHER";
    }>;
    balance: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodEffects<z.ZodNumber, Decimal, number>, z.ZodEffects<z.ZodString, Decimal, string>, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>, Decimal, string | number | Decimal>>>;
    currency: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    bankName: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    accountNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    routingNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
    name: string;
    currency: string;
    balance: Decimal;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}, {
    type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
    name: string;
    currency?: string | undefined;
    description?: string | undefined;
    balance?: string | number | Decimal | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}>;
export type CreateAccountDto = z.infer<typeof CreateAccountSchema>;
export declare const UpdateAccountSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    bankName: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    accountNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    routingNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}>, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}>;
export declare const UpdateAccountBodySchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    bankName: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    accountNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    routingNumber: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}>, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    bankName?: string | undefined;
    accountNumber?: string | undefined;
    routingNumber?: string | undefined;
}>;
export type UpdateAccountDto = z.infer<typeof UpdateAccountSchema>;
export declare const UpdateBalanceSchema: z.ZodObject<{
    amount: z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodEffects<z.ZodNumber, Decimal, number>, z.ZodEffects<z.ZodString, Decimal, string>, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>, Decimal, string | number | Decimal>, Decimal, string | number | Decimal>;
    description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    amount: Decimal;
    description?: string | undefined;
}, {
    amount: string | number | Decimal;
    description?: string | undefined;
}>;
export declare const UpdateBalanceBodySchema: z.ZodObject<{
    amount: z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodEffects<z.ZodNumber, Decimal, number>, z.ZodEffects<z.ZodString, Decimal, string>, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>, Decimal, string | number | Decimal>, Decimal, string | number | Decimal>;
    description: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    amount: Decimal;
    description?: string | undefined;
}, {
    amount: string | number | Decimal;
    description?: string | undefined;
}>;
export type UpdateBalanceDto = z.infer<typeof UpdateBalanceSchema>;
export declare const AccountFiltersSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodNativeEnum<{
        CHECKING: "CHECKING";
        SAVINGS: "SAVINGS";
        CREDIT_CARD: "CREDIT_CARD";
        INVESTMENT: "INVESTMENT";
        LOAN: "LOAN";
        CASH: "CASH";
        OTHER: "OTHER";
    }>>;
    isActive: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodEffects<z.ZodString, boolean, string>]>>;
    currency: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    search: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    type?: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER" | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    search?: string | undefined;
}, {
    type?: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER" | undefined;
    isActive?: string | boolean | undefined;
    currency?: string | undefined;
    search?: string | undefined;
}>;
export type AccountFiltersDto = z.infer<typeof AccountFiltersSchema>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>, number, string | number>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>, number, string | number>>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "balance", "createdAt", "updatedAt"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "name" | "createdAt" | "updatedAt" | "balance";
    sortOrder: "asc" | "desc";
}, {
    page?: string | number | undefined;
    limit?: string | number | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "balance" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type PaginationDto = z.infer<typeof PaginationSchema>;
export declare const AccountParamsSchema: z.ZodObject<{
    accountId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accountId: string;
}, {
    accountId: string;
}>;
export type AccountParamsDto = z.infer<typeof AccountParamsSchema>;
export declare const GetAccountsQuerySchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodNativeEnum<{
        CHECKING: "CHECKING";
        SAVINGS: "SAVINGS";
        CREDIT_CARD: "CREDIT_CARD";
        INVESTMENT: "INVESTMENT";
        LOAN: "LOAN";
        CASH: "CASH";
        OTHER: "OTHER";
    }>>;
    isActive: z.ZodOptional<z.ZodUnion<[z.ZodBoolean, z.ZodEffects<z.ZodString, boolean, string>]>>;
    currency: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    search: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
} & {
    page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>, number, string | number>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>, number, string | number>>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "balance", "createdAt", "updatedAt"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "name" | "createdAt" | "updatedAt" | "balance";
    sortOrder: "asc" | "desc";
    type?: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER" | undefined;
    isActive?: boolean | undefined;
    currency?: string | undefined;
    search?: string | undefined;
}, {
    type?: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER" | undefined;
    isActive?: string | boolean | undefined;
    currency?: string | undefined;
    search?: string | undefined;
    page?: string | number | undefined;
    limit?: string | number | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "balance" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type GetAccountsQueryDto = z.infer<typeof GetAccountsQuerySchema>;
export declare const GetBalanceHistoryQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>, number, string | number>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodUnion<[z.ZodNumber, z.ZodEffects<z.ZodString, number, string>]>, number, string | number>>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "balance", "createdAt", "updatedAt"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: "name" | "createdAt" | "updatedAt" | "balance";
    sortOrder: "asc" | "desc";
}, {
    page?: string | number | undefined;
    limit?: string | number | undefined;
    sortBy?: "name" | "createdAt" | "updatedAt" | "balance" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type GetBalanceHistoryQueryDto = z.infer<typeof GetBalanceHistoryQuerySchema>;
export declare const AccountResponseSchema: z.ZodObject<{
    id: z.ZodString;
    tenantId: z.ZodString;
    userId: z.ZodString;
    name: z.ZodString;
    type: z.ZodNativeEnum<{
        CHECKING: "CHECKING";
        SAVINGS: "SAVINGS";
        CREDIT_CARD: "CREDIT_CARD";
        INVESTMENT: "INVESTMENT";
        LOAN: "LOAN";
        CASH: "CASH";
        OTHER: "OTHER";
    }>;
    subtype: z.ZodNullable<z.ZodString>;
    balance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
    currency: z.ZodString;
    isActive: z.ZodBoolean;
    description: z.ZodNullable<z.ZodString>;
    bankName: z.ZodNullable<z.ZodString>;
    accountNumber: z.ZodNullable<z.ZodString>;
    routingNumber: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
    name: string;
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    currency: string;
    userId: string;
    description: string | null;
    subtype: string | null;
    balance: string | number | Decimal;
    bankName: string | null;
    accountNumber: string | null;
    routingNumber: string | null;
}, {
    type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
    name: string;
    id: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    currency: string;
    userId: string;
    description: string | null;
    subtype: string | null;
    balance: string | number | Decimal;
    bankName: string | null;
    accountNumber: string | null;
    routingNumber: string | null;
}>;
export type AccountResponseDto = z.infer<typeof AccountResponseSchema>;
export declare const AccountListResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    accounts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        userId: z.ZodString;
        name: z.ZodString;
        type: z.ZodNativeEnum<{
            CHECKING: "CHECKING";
            SAVINGS: "SAVINGS";
            CREDIT_CARD: "CREDIT_CARD";
            INVESTMENT: "INVESTMENT";
            LOAN: "LOAN";
            CASH: "CASH";
            OTHER: "OTHER";
        }>;
        subtype: z.ZodNullable<z.ZodString>;
        balance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
        currency: z.ZodString;
        isActive: z.ZodBoolean;
        description: z.ZodNullable<z.ZodString>;
        bankName: z.ZodNullable<z.ZodString>;
        accountNumber: z.ZodNullable<z.ZodString>;
        routingNumber: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    }, {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    }>, "many">;
    total: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    accounts: {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    }[];
    success: boolean;
    message: string;
    total?: number | undefined;
}, {
    accounts: {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    }[];
    success: boolean;
    message: string;
    total?: number | undefined;
}>;
export type AccountListResponseDto = z.infer<typeof AccountListResponseSchema>;
export declare const AccountSingleResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    account: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        tenantId: z.ZodString;
        userId: z.ZodString;
        name: z.ZodString;
        type: z.ZodNativeEnum<{
            CHECKING: "CHECKING";
            SAVINGS: "SAVINGS";
            CREDIT_CARD: "CREDIT_CARD";
            INVESTMENT: "INVESTMENT";
            LOAN: "LOAN";
            CASH: "CASH";
            OTHER: "OTHER";
        }>;
        subtype: z.ZodNullable<z.ZodString>;
        balance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
        currency: z.ZodString;
        isActive: z.ZodBoolean;
        description: z.ZodNullable<z.ZodString>;
        bankName: z.ZodNullable<z.ZodString>;
        accountNumber: z.ZodNullable<z.ZodString>;
        routingNumber: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    }, {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message: string;
    account?: {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    } | undefined;
}, {
    success: boolean;
    message: string;
    account?: {
        type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER";
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        currency: string;
        userId: string;
        description: string | null;
        subtype: string | null;
        balance: string | number | Decimal;
        bankName: string | null;
        accountNumber: string | null;
        routingNumber: string | null;
    } | undefined;
}>;
export type AccountSingleResponseDto = z.infer<typeof AccountSingleResponseSchema>;
export declare const BalanceHistoryItemSchema: z.ZodObject<{
    id: z.ZodString;
    accountId: z.ZodString;
    tenantId: z.ZodString;
    previousBalance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
    newBalance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
    change: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
    description: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    tenantId: string;
    accountId: string;
    previousBalance: string | number | Decimal;
    newBalance: string | number | Decimal;
    change: string | number | Decimal;
    timestamp: Date;
    description?: string | undefined;
}, {
    id: string;
    tenantId: string;
    accountId: string;
    previousBalance: string | number | Decimal;
    newBalance: string | number | Decimal;
    change: string | number | Decimal;
    timestamp: Date;
    description?: string | undefined;
}>;
export type BalanceHistoryItemDto = z.infer<typeof BalanceHistoryItemSchema>;
export declare const BalanceHistoryResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    history: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        accountId: z.ZodString;
        tenantId: z.ZodString;
        previousBalance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
        newBalance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
        change: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
        description: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        id: string;
        tenantId: string;
        accountId: string;
        previousBalance: string | number | Decimal;
        newBalance: string | number | Decimal;
        change: string | number | Decimal;
        timestamp: Date;
        description?: string | undefined;
    }, {
        id: string;
        tenantId: string;
        accountId: string;
        previousBalance: string | number | Decimal;
        newBalance: string | number | Decimal;
        change: string | number | Decimal;
        timestamp: Date;
        description?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message: string;
    history?: {
        id: string;
        tenantId: string;
        accountId: string;
        previousBalance: string | number | Decimal;
        newBalance: string | number | Decimal;
        change: string | number | Decimal;
        timestamp: Date;
        description?: string | undefined;
    }[] | undefined;
}, {
    success: boolean;
    message: string;
    history?: {
        id: string;
        tenantId: string;
        accountId: string;
        previousBalance: string | number | Decimal;
        newBalance: string | number | Decimal;
        change: string | number | Decimal;
        timestamp: Date;
        description?: string | undefined;
    }[] | undefined;
}>;
export type BalanceHistoryResponseDto = z.infer<typeof BalanceHistoryResponseSchema>;
export declare const AccountSummaryResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    summary: z.ZodOptional<z.ZodObject<{
        totalAccounts: z.ZodNumber;
        activeAccounts: z.ZodNumber;
        totalBalance: z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>;
        balanceByType: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>>;
        balanceByCurrency: z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodType<Decimal, z.ZodTypeDef, Decimal>]>>;
    }, "strip", z.ZodTypeAny, {
        totalAccounts: number;
        activeAccounts: number;
        totalBalance: string | number | Decimal;
        balanceByType: Record<string, string | number | Decimal>;
        balanceByCurrency: Record<string, string | number | Decimal>;
    }, {
        totalAccounts: number;
        activeAccounts: number;
        totalBalance: string | number | Decimal;
        balanceByType: Record<string, string | number | Decimal>;
        balanceByCurrency: Record<string, string | number | Decimal>;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message: string;
    summary?: {
        totalAccounts: number;
        activeAccounts: number;
        totalBalance: string | number | Decimal;
        balanceByType: Record<string, string | number | Decimal>;
        balanceByCurrency: Record<string, string | number | Decimal>;
    } | undefined;
}, {
    success: boolean;
    message: string;
    summary?: {
        totalAccounts: number;
        activeAccounts: number;
        totalBalance: string | number | Decimal;
        balanceByType: Record<string, string | number | Decimal>;
        balanceByCurrency: Record<string, string | number | Decimal>;
    } | undefined;
}>;
export type AccountSummaryResponseDto = z.infer<typeof AccountSummaryResponseSchema>;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    message: z.ZodString;
    errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: false;
    message: string;
    code?: string | undefined;
    errors?: string[] | undefined;
}, {
    success: false;
    message: string;
    code?: string | undefined;
    errors?: string[] | undefined;
}>;
export type ErrorResponseDto = z.infer<typeof ErrorResponseSchema>;
export declare const ValidationErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    message: z.ZodString;
    errors: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        message: z.ZodString;
        code: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        field: string;
        code?: string | undefined;
    }, {
        message: string;
        field: string;
        code?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    success: false;
    message: string;
    errors: {
        message: string;
        field: string;
        code?: string | undefined;
    }[];
}, {
    success: false;
    message: string;
    errors: {
        message: string;
        field: string;
        code?: string | undefined;
    }[];
}>;
export type ValidationErrorResponseDto = z.infer<typeof ValidationErrorResponseSchema>;
export declare const TenantContextSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
    userRole: z.ZodOptional<z.ZodString>;
    userEmail: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    userRole?: string | undefined;
    userEmail?: string | undefined;
}, {
    tenantId: string;
    userId: string;
    userRole?: string | undefined;
    userEmail?: string | undefined;
}>;
export type TenantContextDto = z.infer<typeof TenantContextSchema>;
export declare const OpenAPISchemas: {
    readonly CreateAccountRequest: {
        readonly type: "object";
        readonly required: readonly ["name", "type"];
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly minLength: 1;
                readonly maxLength: 255;
                readonly description: "Account name";
                readonly example: "Primary Checking Account";
            };
            readonly type: {
                readonly type: "string";
                readonly enum: ("CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER")[];
                readonly description: "Account type";
                readonly example: "CHECKING";
            };
            readonly balance: {
                readonly type: "number";
                readonly format: "decimal";
                readonly description: "Initial balance";
                readonly example: 1000;
                readonly default: 0;
            };
            readonly currency: {
                readonly type: "string";
                readonly length: 3;
                readonly description: "Currency code";
                readonly example: "USD";
                readonly default: "USD";
            };
            readonly description: {
                readonly type: "string";
                readonly maxLength: 500;
                readonly description: "Account description";
                readonly example: "Main checking account for daily transactions";
            };
            readonly bankName: {
                readonly type: "string";
                readonly maxLength: 100;
                readonly description: "Bank name";
                readonly example: "Chase Bank";
            };
            readonly accountNumber: {
                readonly type: "string";
                readonly maxLength: 50;
                readonly description: "Account number";
                readonly example: "****1234";
            };
            readonly routingNumber: {
                readonly type: "string";
                readonly maxLength: 20;
                readonly description: "Routing number";
                readonly example: "123456789";
            };
        };
    };
    readonly UpdateAccountRequest: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
                readonly minLength: 1;
                readonly maxLength: 255;
                readonly description: "Account name";
                readonly example: "Updated Account Name";
            };
            readonly description: {
                readonly type: "string";
                readonly maxLength: 500;
                readonly description: "Account description";
            };
            readonly bankName: {
                readonly type: "string";
                readonly maxLength: 100;
                readonly description: "Bank name";
            };
            readonly accountNumber: {
                readonly type: "string";
                readonly maxLength: 50;
                readonly description: "Account number";
            };
            readonly routingNumber: {
                readonly type: "string";
                readonly maxLength: 20;
                readonly description: "Routing number";
            };
        };
    };
    readonly UpdateBalanceRequest: {
        readonly type: "object";
        readonly required: readonly ["amount"];
        readonly properties: {
            readonly amount: {
                readonly type: "number";
                readonly format: "decimal";
                readonly description: "Amount to add/subtract from balance";
                readonly example: 500;
            };
            readonly description: {
                readonly type: "string";
                readonly maxLength: 255;
                readonly description: "Description of balance change";
                readonly example: "Manual balance adjustment";
            };
        };
    };
    readonly AccountResponse: {
        readonly type: "object";
        readonly properties: {
            readonly id: {
                readonly type: "string";
                readonly example: "acc_123456789";
            };
            readonly tenantId: {
                readonly type: "string";
                readonly example: "tenant_123";
            };
            readonly userId: {
                readonly type: "string";
                readonly example: "user_123";
            };
            readonly name: {
                readonly type: "string";
                readonly example: "Primary Checking";
            };
            readonly type: {
                readonly type: "string";
                readonly enum: ("CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "LOAN" | "CASH" | "OTHER")[];
                readonly example: "CHECKING";
            };
            readonly subtype: {
                readonly type: "string";
                readonly nullable: true;
                readonly example: null;
            };
            readonly balance: {
                readonly type: "number";
                readonly format: "decimal";
                readonly example: 1500;
            };
            readonly currency: {
                readonly type: "string";
                readonly example: "USD";
            };
            readonly isActive: {
                readonly type: "boolean";
                readonly example: true;
            };
            readonly description: {
                readonly type: "string";
                readonly nullable: true;
                readonly example: "Main checking account";
            };
            readonly bankName: {
                readonly type: "string";
                readonly nullable: true;
                readonly example: "Chase Bank";
            };
            readonly accountNumber: {
                readonly type: "string";
                readonly nullable: true;
                readonly example: "****1234";
            };
            readonly routingNumber: {
                readonly type: "string";
                readonly nullable: true;
                readonly example: "123456789";
            };
            readonly createdAt: {
                readonly type: "string";
                readonly format: "date-time";
                readonly example: "2024-01-15T10:00:00Z";
            };
            readonly updatedAt: {
                readonly type: "string";
                readonly format: "date-time";
                readonly example: "2024-01-20T15:30:00Z";
            };
        };
    };
};
//# sourceMappingURL=accounts.dto.d.ts.map