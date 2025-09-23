import { PrismaClient, Transaction, TransactionType, RecurringTransaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
export interface CreateTransactionData {
    accountId: string;
    categoryId?: string;
    toAccountId?: string;
    amount: Decimal;
    type: TransactionType;
    description: string;
    date?: Date;
    tags?: string[];
    metadata?: Record<string, any>;
}
export interface UpdateTransactionData {
    categoryId?: string;
    amount?: Decimal;
    description?: string;
    date?: Date;
    tags?: string[];
    metadata?: Record<string, any>;
}
export interface CreateRecurringTransactionData {
    accountId: string;
    categoryId?: string;
    toAccountId?: string;
    amount: Decimal;
    type: TransactionType;
    description: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    startDate: Date;
    endDate?: Date;
    tags?: string[];
    metadata?: Record<string, any>;
}
export interface TransactionResult {
    success: boolean;
    message: string;
    transaction?: Transaction;
}
export interface TransactionsResult {
    success: boolean;
    message: string;
    transactions?: Transaction[];
    total?: number;
}
export interface RecurringTransactionResult {
    success: boolean;
    message: string;
    recurringTransaction?: RecurringTransaction;
}
export interface GenerateRecurringResult {
    success: boolean;
    message: string;
    generated?: number;
}
export interface TransactionFilters {
    accountId?: string;
    categoryId?: string;
    type?: TransactionType;
    startDate?: Date;
    endDate?: Date;
    minAmount?: Decimal;
    maxAmount?: Decimal;
    search?: string;
    tags?: string[];
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: 'date' | 'amount' | 'description';
    sortOrder?: 'asc' | 'desc';
}
export declare class TransactionService {
    private prisma;
    constructor(prisma: PrismaClient);
    createTransaction(data: CreateTransactionData, userId: string, tenantId: string): Promise<TransactionResult>;
    getTransactions(userId: string, tenantId: string, filters?: TransactionFilters, pagination?: PaginationOptions): Promise<TransactionsResult>;
    getTransaction(transactionId: string, userId: string, tenantId: string): Promise<TransactionResult>;
    updateTransaction(transactionId: string, data: UpdateTransactionData, userId: string, tenantId: string): Promise<TransactionResult>;
    deleteTransaction(transactionId: string, userId: string, tenantId: string): Promise<TransactionResult>;
    createRecurringTransaction(data: CreateRecurringTransactionData, userId: string, tenantId: string): Promise<RecurringTransactionResult>;
    generateRecurringTransactions(userId: string, tenantId: string): Promise<GenerateRecurringResult>;
    private reverseBalanceChanges;
    private applyBalanceChanges;
    private calculateNextDueDate;
}
//# sourceMappingURL=transactions.service.d.ts.map