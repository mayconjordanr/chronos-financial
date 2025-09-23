import { PrismaClient, Account, AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
export interface CreateAccountData {
    name: string;
    type: AccountType;
    balance?: Decimal;
    currency?: string;
    description?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
}
export interface UpdateAccountData {
    name?: string;
    description?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
}
export interface AccountFilters {
    type?: AccountType;
    isActive?: boolean;
    currency?: string;
    search?: string;
}
export interface AccountResult {
    success: boolean;
    message: string;
    account?: Account;
}
export interface AccountsResult {
    success: boolean;
    message: string;
    accounts?: Account[];
    total?: number;
}
export interface BalanceUpdateResult {
    success: boolean;
    message: string;
    account?: Account;
    balanceHistory?: BalanceHistory;
}
export interface BalanceHistoryResult {
    success: boolean;
    message: string;
    history?: BalanceHistory[];
}
export interface BalanceHistory {
    id: string;
    accountId: string;
    tenantId: string;
    previousBalance: Decimal;
    newBalance: Decimal;
    change: Decimal;
    timestamp: Date;
}
export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: 'name' | 'balance' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}
export declare class AccountService {
    private prisma;
    private readonly SUPPORTED_CURRENCIES;
    private readonly MAX_NAME_LENGTH;
    private readonly MIN_NAME_LENGTH;
    constructor(prisma: PrismaClient);
    createAccount(data: CreateAccountData, userId: string, tenantId: string): Promise<AccountResult>;
    getAccounts(userId: string, tenantId: string, filters?: AccountFilters, pagination?: PaginationOptions): Promise<AccountsResult>;
    getAccount(accountId: string, userId: string, tenantId: string): Promise<AccountResult>;
    updateAccount(accountId: string, data: UpdateAccountData, userId: string, tenantId: string): Promise<AccountResult>;
    deleteAccount(accountId: string, userId: string, tenantId: string): Promise<AccountResult>;
    updateBalance(accountId: string, amount: Decimal, userId: string, tenantId: string, description?: string): Promise<BalanceUpdateResult>;
    getBalanceHistory(accountId: string, userId: string, tenantId: string, pagination?: PaginationOptions): Promise<BalanceHistoryResult>;
    getAccountSummary(userId: string, tenantId: string): Promise<{
        success: boolean;
        message: string;
        summary?: {
            totalAccounts: number;
            activeAccounts: number;
            totalBalance: Decimal;
            balanceByType: Record<string, Decimal>;
            balanceByCurrency: Record<string, Decimal>;
        };
    }>;
    private validateAccountData;
    private validateUpdateData;
}
//# sourceMappingURL=accounts.service.d.ts.map