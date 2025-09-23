"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
class AccountService {
    prisma;
    SUPPORTED_CURRENCIES = [
        'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'BRL'
    ];
    MAX_NAME_LENGTH = 255;
    MIN_NAME_LENGTH = 1;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAccount(data, userId, tenantId) {
        try {
            const validationError = this.validateAccountData(data);
            if (validationError) {
                return {
                    success: false,
                    message: validationError
                };
            }
            const user = await this.prisma.user.findFirst({
                where: {
                    id: userId,
                    tenantId,
                    isActive: true
                }
            });
            if (!user) {
                return {
                    success: false,
                    message: 'User not found in this tenant'
                };
            }
            const accountData = {
                tenantId,
                userId,
                name: data.name.trim(),
                type: data.type,
                balance: data.balance || new library_1.Decimal('0'),
                currency: data.currency || 'USD',
                description: data.description?.trim() || null,
                bankName: data.bankName?.trim() || null,
                accountNumber: data.accountNumber?.trim() || null,
                routingNumber: data.routingNumber?.trim() || null,
                isActive: true
            };
            const existingAccount = await this.prisma.account.findFirst({
                where: {
                    tenantId,
                    userId,
                    name: accountData.name,
                    isActive: true
                }
            });
            if (existingAccount) {
                return {
                    success: false,
                    message: 'Account with this name already exists'
                };
            }
            const account = await this.prisma.account.create({
                data: accountData
            });
            return {
                success: true,
                message: 'Account created successfully',
                account
            };
        }
        catch (error) {
            console.error('Error creating account:', error);
            if (error instanceof Error) {
                if (error.message.includes('P2002')) {
                    return {
                        success: false,
                        message: 'Account with this name already exists'
                    };
                }
            }
            return {
                success: false,
                message: 'Failed to create account'
            };
        }
    }
    async getAccounts(userId, tenantId, filters, pagination) {
        try {
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 50;
            const skip = (page - 1) * limit;
            const sortBy = pagination?.sortBy || 'createdAt';
            const sortOrder = pagination?.sortOrder || 'desc';
            const where = {
                tenantId,
                userId
            };
            if (filters?.type) {
                where.type = filters.type;
            }
            if (filters?.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            if (filters?.currency) {
                where.currency = filters.currency;
            }
            if (filters?.search) {
                where.OR = [
                    {
                        name: {
                            contains: filters.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: filters.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        bankName: {
                            contains: filters.search,
                            mode: 'insensitive'
                        }
                    }
                ];
            }
            const [accounts, total] = await Promise.all([
                this.prisma.account.findMany({
                    where,
                    orderBy: {
                        [sortBy]: sortOrder
                    },
                    skip: limit > 0 ? skip : undefined,
                    take: limit > 0 ? limit : undefined
                }),
                this.prisma.account.count({ where })
            ]);
            return {
                success: true,
                message: 'Accounts retrieved successfully',
                accounts,
                total
            };
        }
        catch (error) {
            console.error('Error getting accounts:', error);
            return {
                success: false,
                message: 'Failed to retrieve accounts'
            };
        }
    }
    async getAccount(accountId, userId, tenantId) {
        try {
            const account = await this.prisma.account.findFirst({
                where: {
                    id: accountId,
                    tenantId,
                    userId
                }
            });
            if (!account) {
                return {
                    success: false,
                    message: 'Account not found or access denied'
                };
            }
            return {
                success: true,
                message: 'Account retrieved successfully',
                account
            };
        }
        catch (error) {
            console.error('Error getting account:', error);
            return {
                success: false,
                message: 'Failed to retrieve account'
            };
        }
    }
    async updateAccount(accountId, data, userId, tenantId) {
        try {
            const validationError = this.validateUpdateData(data);
            if (validationError) {
                return {
                    success: false,
                    message: validationError
                };
            }
            const existingAccount = await this.prisma.account.findFirst({
                where: {
                    id: accountId,
                    tenantId,
                    userId
                }
            });
            if (!existingAccount) {
                return {
                    success: false,
                    message: 'Account not found or access denied'
                };
            }
            if (data.name && data.name !== existingAccount.name) {
                const duplicateAccount = await this.prisma.account.findFirst({
                    where: {
                        tenantId,
                        userId,
                        name: data.name.trim(),
                        id: { not: accountId },
                        isActive: true
                    }
                });
                if (duplicateAccount) {
                    return {
                        success: false,
                        message: 'Account with this name already exists'
                    };
                }
            }
            const updateData = {
                updatedAt: new Date()
            };
            if (data.name !== undefined) {
                updateData.name = data.name.trim();
            }
            if (data.description !== undefined) {
                updateData.description = data.description?.trim() || null;
            }
            if (data.bankName !== undefined) {
                updateData.bankName = data.bankName?.trim() || null;
            }
            if (data.accountNumber !== undefined) {
                updateData.accountNumber = data.accountNumber?.trim() || null;
            }
            if (data.routingNumber !== undefined) {
                updateData.routingNumber = data.routingNumber?.trim() || null;
            }
            const updatedAccount = await this.prisma.account.update({
                where: { id: accountId },
                data: updateData
            });
            return {
                success: true,
                message: 'Account updated successfully',
                account: updatedAccount
            };
        }
        catch (error) {
            console.error('Error updating account:', error);
            return {
                success: false,
                message: 'Failed to update account'
            };
        }
    }
    async deleteAccount(accountId, userId, tenantId) {
        try {
            const existingAccount = await this.prisma.account.findFirst({
                where: {
                    id: accountId,
                    tenantId,
                    userId
                }
            });
            if (!existingAccount) {
                return {
                    success: false,
                    message: 'Account not found or access denied'
                };
            }
            if (!existingAccount.balance.equals(new library_1.Decimal('0'))) {
                return {
                    success: false,
                    message: 'Cannot delete account with non-zero balance'
                };
            }
            const transactionCount = await this.prisma.transaction.count({
                where: {
                    accountId,
                    tenantId
                }
            });
            if (transactionCount > 0) {
                return {
                    success: false,
                    message: 'Cannot delete account with existing transactions. Consider deactivating instead.'
                };
            }
            const deletedAccount = await this.prisma.account.update({
                where: { id: accountId },
                data: {
                    isActive: false,
                    updatedAt: new Date()
                }
            });
            return {
                success: true,
                message: 'Account deleted successfully',
                account: deletedAccount
            };
        }
        catch (error) {
            console.error('Error deleting account:', error);
            return {
                success: false,
                message: 'Failed to delete account'
            };
        }
    }
    async updateBalance(accountId, amount, userId, tenantId, description) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const account = await tx.account.findFirst({
                    where: {
                        id: accountId,
                        tenantId,
                        userId
                    }
                });
                if (!account) {
                    throw new Error('Account not found or access denied');
                }
                const previousBalance = account.balance;
                const newBalance = previousBalance.add(amount);
                const updatedAccount = await tx.account.update({
                    where: { id: accountId },
                    data: {
                        balance: newBalance,
                        updatedAt: new Date()
                    }
                });
                let balanceHistory = null;
                try {
                    balanceHistory = await tx.balanceHistory.create({
                        data: {
                            accountId,
                            tenantId,
                            previousBalance,
                            newBalance,
                            change: amount,
                            description: description || 'Balance update',
                            timestamp: new Date()
                        }
                    });
                }
                catch (historyError) {
                    console.warn('Balance history not recorded:', historyError);
                }
                return { updatedAccount, balanceHistory };
            });
            return {
                success: true,
                message: 'Balance updated successfully',
                account: result.updatedAccount,
                balanceHistory: result.balanceHistory
            };
        }
        catch (error) {
            console.error('Error updating balance:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update balance'
            };
        }
    }
    async getBalanceHistory(accountId, userId, tenantId, pagination) {
        try {
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 50;
            const skip = (page - 1) * limit;
            const account = await this.prisma.account.findFirst({
                where: {
                    id: accountId,
                    tenantId,
                    userId
                }
            });
            if (!account) {
                return {
                    success: false,
                    message: 'Account not found or access denied'
                };
            }
            let history = [];
            try {
                history = await this.prisma.balanceHistory.findMany({
                    where: {
                        accountId,
                        tenantId,
                        account: {
                            userId
                        }
                    },
                    orderBy: {
                        timestamp: 'desc'
                    },
                    skip: limit > 0 ? skip : undefined,
                    take: limit > 0 ? limit : undefined
                });
            }
            catch (error) {
                console.warn('Balance history table not available:', error);
            }
            return {
                success: true,
                message: 'Balance history retrieved successfully',
                history
            };
        }
        catch (error) {
            console.error('Error getting balance history:', error);
            return {
                success: false,
                message: 'Failed to retrieve balance history'
            };
        }
    }
    async getAccountSummary(userId, tenantId) {
        try {
            const accounts = await this.prisma.account.findMany({
                where: {
                    tenantId,
                    userId
                }
            });
            const totalAccounts = accounts.length;
            const activeAccounts = accounts.filter(a => a.isActive).length;
            let totalBalance = new library_1.Decimal('0');
            const balanceByType = {};
            const balanceByCurrency = {};
            for (const account of accounts) {
                if (!account.isActive)
                    continue;
                const typeKey = account.type;
                balanceByType[typeKey] = (balanceByType[typeKey] || new library_1.Decimal('0')).add(account.balance);
                const currencyKey = account.currency;
                balanceByCurrency[currencyKey] = (balanceByCurrency[currencyKey] || new library_1.Decimal('0')).add(account.balance);
                totalBalance = totalBalance.add(account.balance);
            }
            return {
                success: true,
                message: 'Account summary retrieved successfully',
                summary: {
                    totalAccounts,
                    activeAccounts,
                    totalBalance,
                    balanceByType,
                    balanceByCurrency
                }
            };
        }
        catch (error) {
            console.error('Error getting account summary:', error);
            return {
                success: false,
                message: 'Failed to retrieve account summary'
            };
        }
    }
    validateAccountData(data) {
        if (!data.name || data.name.trim().length === 0) {
            return 'Account name is required';
        }
        if (data.name.trim().length > this.MAX_NAME_LENGTH) {
            return 'Account name is too long';
        }
        if (!data.type || !Object.values(client_1.AccountType).includes(data.type)) {
            return 'Valid account type is required';
        }
        if (data.balance && data.balance.lessThan(new library_1.Decimal('-999999999999.99'))) {
            return 'Balance cannot be less than minimum allowed value';
        }
        if (data.balance && data.balance.greaterThan(new library_1.Decimal('999999999999.99'))) {
            return 'Balance cannot exceed maximum allowed value';
        }
        if (data.currency && !this.SUPPORTED_CURRENCIES.includes(data.currency.toUpperCase())) {
            return 'Invalid currency format';
        }
        if (data.description && data.description.length > 500) {
            return 'Description is too long (max 500 characters)';
        }
        return null;
    }
    validateUpdateData(data) {
        if ('type' in data || 'balance' in data || 'tenantId' in data || 'userId' in data) {
            return 'Cannot update account type or balance directly';
        }
        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                return 'Account name cannot be empty';
            }
            if (data.name.trim().length > this.MAX_NAME_LENGTH) {
                return 'Account name is too long';
            }
        }
        if (data.description !== undefined && data.description && data.description.length > 500) {
            return 'Description is too long (max 500 characters)';
        }
        return null;
    }
}
exports.AccountService = AccountService;
//# sourceMappingURL=accounts.service.js.map