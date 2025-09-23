"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const client_1 = require("@prisma/client");
class TransactionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createTransaction(data, userId, tenantId) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const account = await tx.account.findFirst({
                    where: {
                        id: data.accountId,
                        tenantId,
                        userId
                    }
                });
                if (!account) {
                    throw new Error('Account not found or access denied');
                }
                if (data.categoryId) {
                    const category = await tx.category.findFirst({
                        where: {
                            id: data.categoryId,
                            tenantId
                        }
                    });
                    if (!category) {
                        throw new Error('Category not found or access denied');
                    }
                }
                let toAccount = null;
                if (data.type === client_1.TransactionType.TRANSFER && data.toAccountId) {
                    toAccount = await tx.account.findFirst({
                        where: {
                            id: data.toAccountId,
                            tenantId,
                            userId
                        }
                    });
                    if (!toAccount) {
                        throw new Error('Destination account not found or access denied');
                    }
                }
                const transaction = await tx.transaction.create({
                    data: {
                        tenantId,
                        userId,
                        accountId: data.accountId,
                        categoryId: data.categoryId || null,
                        toAccountId: data.toAccountId || null,
                        amount: data.amount,
                        type: data.type,
                        description: data.description,
                        date: data.date || new Date(),
                        tags: data.tags || [],
                        metadata: data.metadata || {}
                    }
                });
                if (data.type === client_1.TransactionType.INCOME) {
                    await tx.account.update({
                        where: { id: data.accountId },
                        data: {
                            balance: {
                                increment: data.amount
                            }
                        }
                    });
                }
                else if (data.type === client_1.TransactionType.EXPENSE) {
                    await tx.account.update({
                        where: { id: data.accountId },
                        data: {
                            balance: {
                                decrement: data.amount
                            }
                        }
                    });
                }
                else if (data.type === client_1.TransactionType.TRANSFER && data.toAccountId) {
                    await tx.account.update({
                        where: { id: data.accountId },
                        data: {
                            balance: {
                                decrement: data.amount
                            }
                        }
                    });
                    await tx.account.update({
                        where: { id: data.toAccountId },
                        data: {
                            balance: {
                                increment: data.amount
                            }
                        }
                    });
                }
                return transaction;
            });
            return {
                success: true,
                message: 'Transaction created successfully',
                transaction: result
            };
        }
        catch (error) {
            console.error('Error creating transaction:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create transaction'
            };
        }
    }
    async getTransactions(userId, tenantId, filters, pagination) {
        try {
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 50;
            const skip = (page - 1) * limit;
            const sortBy = pagination?.sortBy || 'date';
            const sortOrder = pagination?.sortOrder || 'desc';
            const where = {
                tenantId,
                userId
            };
            if (filters?.accountId) {
                where.accountId = filters.accountId;
            }
            if (filters?.categoryId) {
                where.categoryId = filters.categoryId;
            }
            if (filters?.type) {
                where.type = filters.type;
            }
            if (filters?.startDate || filters?.endDate) {
                where.date = {};
                if (filters.startDate) {
                    where.date.gte = filters.startDate;
                }
                if (filters.endDate) {
                    where.date.lte = filters.endDate;
                }
            }
            if (filters?.minAmount || filters?.maxAmount) {
                where.amount = {};
                if (filters.minAmount) {
                    where.amount.gte = filters.minAmount;
                }
                if (filters.maxAmount) {
                    where.amount.lte = filters.maxAmount;
                }
            }
            if (filters?.search) {
                where.description = {
                    contains: filters.search,
                    mode: 'insensitive'
                };
            }
            if (filters?.tags && filters.tags.length > 0) {
                where.tags = {
                    hasSome: filters.tags
                };
            }
            const [transactions, total] = await Promise.all([
                this.prisma.transaction.findMany({
                    where,
                    include: {
                        account: {
                            select: { id: true, name: true, type: true }
                        },
                        category: {
                            select: { id: true, name: true, color: true, icon: true }
                        },
                        toAccount: {
                            select: { id: true, name: true, type: true }
                        }
                    },
                    orderBy: {
                        [sortBy]: sortOrder
                    },
                    skip,
                    take: limit
                }),
                this.prisma.transaction.count({ where })
            ]);
            return {
                success: true,
                message: 'Transactions retrieved successfully',
                transactions,
                total
            };
        }
        catch (error) {
            console.error('Error getting transactions:', error);
            return {
                success: false,
                message: 'Failed to retrieve transactions'
            };
        }
    }
    async getTransaction(transactionId, userId, tenantId) {
        try {
            const transaction = await this.prisma.transaction.findFirst({
                where: {
                    id: transactionId,
                    tenantId,
                    userId
                },
                include: {
                    account: {
                        select: { id: true, name: true, type: true }
                    },
                    category: {
                        select: { id: true, name: true, color: true, icon: true }
                    },
                    toAccount: {
                        select: { id: true, name: true, type: true }
                    }
                }
            });
            if (!transaction) {
                return {
                    success: false,
                    message: 'Transaction not found or access denied'
                };
            }
            return {
                success: true,
                message: 'Transaction retrieved successfully',
                transaction
            };
        }
        catch (error) {
            console.error('Error getting transaction:', error);
            return {
                success: false,
                message: 'Failed to retrieve transaction'
            };
        }
    }
    async updateTransaction(transactionId, data, userId, tenantId) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const existingTransaction = await tx.transaction.findFirst({
                    where: {
                        id: transactionId,
                        tenantId,
                        userId
                    },
                    include: {
                        account: true,
                        toAccount: true
                    }
                });
                if (!existingTransaction) {
                    throw new Error('Transaction not found or access denied');
                }
                if (data.categoryId) {
                    const category = await tx.category.findFirst({
                        where: {
                            id: data.categoryId,
                            tenantId
                        }
                    });
                    if (!category) {
                        throw new Error('Category not found or access denied');
                    }
                }
                await this.reverseBalanceChanges(tx, existingTransaction);
                const updatedTransaction = await tx.transaction.update({
                    where: { id: transactionId },
                    data: {
                        categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
                        amount: data.amount !== undefined ? data.amount : undefined,
                        description: data.description !== undefined ? data.description : undefined,
                        date: data.date !== undefined ? data.date : undefined,
                        tags: data.tags !== undefined ? data.tags : undefined,
                        metadata: data.metadata !== undefined ? data.metadata : undefined,
                        updatedAt: new Date()
                    }
                });
                await this.applyBalanceChanges(tx, updatedTransaction);
                return updatedTransaction;
            });
            return {
                success: true,
                message: 'Transaction updated successfully',
                transaction: result
            };
        }
        catch (error) {
            console.error('Error updating transaction:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update transaction'
            };
        }
    }
    async deleteTransaction(transactionId, userId, tenantId) {
        try {
            const result = await this.prisma.$transaction(async (tx) => {
                const existingTransaction = await tx.transaction.findFirst({
                    where: {
                        id: transactionId,
                        tenantId,
                        userId
                    },
                    include: {
                        account: true,
                        toAccount: true
                    }
                });
                if (!existingTransaction) {
                    throw new Error('Transaction not found or access denied');
                }
                await this.reverseBalanceChanges(tx, existingTransaction);
                await tx.transaction.delete({
                    where: { id: transactionId }
                });
                return existingTransaction;
            });
            return {
                success: true,
                message: 'Transaction deleted successfully',
                transaction: result
            };
        }
        catch (error) {
            console.error('Error deleting transaction:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete transaction'
            };
        }
    }
    async createRecurringTransaction(data, userId, tenantId) {
        try {
            const account = await this.prisma.account.findFirst({
                where: {
                    id: data.accountId,
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
            if (data.categoryId) {
                const category = await this.prisma.category.findFirst({
                    where: {
                        id: data.categoryId,
                        tenantId
                    }
                });
                if (!category) {
                    return {
                        success: false,
                        message: 'Category not found or access denied'
                    };
                }
            }
            if (data.type === client_1.TransactionType.TRANSFER && data.toAccountId) {
                const toAccount = await this.prisma.account.findFirst({
                    where: {
                        id: data.toAccountId,
                        tenantId,
                        userId
                    }
                });
                if (!toAccount) {
                    return {
                        success: false,
                        message: 'Destination account not found or access denied'
                    };
                }
            }
            const recurringTransaction = await this.prisma.recurringTransaction.create({
                data: {
                    tenantId,
                    userId,
                    accountId: data.accountId,
                    categoryId: data.categoryId || null,
                    toAccountId: data.toAccountId || null,
                    amount: data.amount,
                    type: data.type,
                    description: data.description,
                    frequency: data.frequency,
                    startDate: data.startDate,
                    endDate: data.endDate || null,
                    nextDueDate: data.startDate,
                    isActive: true,
                    tags: data.tags || [],
                    metadata: data.metadata || {}
                }
            });
            return {
                success: true,
                message: 'Recurring transaction created successfully',
                recurringTransaction
            };
        }
        catch (error) {
            console.error('Error creating recurring transaction:', error);
            return {
                success: false,
                message: 'Failed to create recurring transaction'
            };
        }
    }
    async generateRecurringTransactions(userId, tenantId) {
        try {
            let generatedCount = 0;
            const recurringTransactions = await this.prisma.recurringTransaction.findMany({
                where: {
                    tenantId,
                    userId,
                    isActive: true,
                    nextDueDate: {
                        lte: new Date()
                    }
                }
            });
            for (const recurring of recurringTransactions) {
                if (recurring.endDate && recurring.endDate < new Date()) {
                    await this.prisma.recurringTransaction.update({
                        where: { id: recurring.id },
                        data: { isActive: false }
                    });
                    continue;
                }
                const transactionData = {
                    accountId: recurring.accountId,
                    categoryId: recurring.categoryId || undefined,
                    toAccountId: recurring.toAccountId || undefined,
                    amount: recurring.amount,
                    type: recurring.type,
                    description: recurring.description,
                    date: recurring.nextDueDate,
                    tags: recurring.tags,
                    metadata: recurring.metadata
                };
                const result = await this.createTransaction(transactionData, userId, tenantId);
                if (result.success) {
                    generatedCount++;
                    const nextDueDate = this.calculateNextDueDate(recurring.nextDueDate, recurring.frequency);
                    await this.prisma.recurringTransaction.update({
                        where: { id: recurring.id },
                        data: {
                            nextDueDate,
                            lastGeneratedAt: new Date()
                        }
                    });
                }
            }
            return {
                success: true,
                message: `Generated ${generatedCount} recurring transactions`,
                generated: generatedCount
            };
        }
        catch (error) {
            console.error('Error generating recurring transactions:', error);
            return {
                success: false,
                message: 'Failed to generate recurring transactions'
            };
        }
    }
    async reverseBalanceChanges(tx, transaction) {
        if (transaction.type === client_1.TransactionType.INCOME) {
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    balance: {
                        decrement: transaction.amount
                    }
                }
            });
        }
        else if (transaction.type === client_1.TransactionType.EXPENSE) {
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    balance: {
                        increment: transaction.amount
                    }
                }
            });
        }
        else if (transaction.type === client_1.TransactionType.TRANSFER && transaction.toAccountId) {
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    balance: {
                        increment: transaction.amount
                    }
                }
            });
            await tx.account.update({
                where: { id: transaction.toAccountId },
                data: {
                    balance: {
                        decrement: transaction.amount
                    }
                }
            });
        }
    }
    async applyBalanceChanges(tx, transaction) {
        if (transaction.type === client_1.TransactionType.INCOME) {
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    balance: {
                        increment: transaction.amount
                    }
                }
            });
        }
        else if (transaction.type === client_1.TransactionType.EXPENSE) {
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    balance: {
                        decrement: transaction.amount
                    }
                }
            });
        }
        else if (transaction.type === client_1.TransactionType.TRANSFER && transaction.toAccountId) {
            await tx.account.update({
                where: { id: transaction.accountId },
                data: {
                    balance: {
                        decrement: transaction.amount
                    }
                }
            });
            await tx.account.update({
                where: { id: transaction.toAccountId },
                data: {
                    balance: {
                        increment: transaction.amount
                    }
                }
            });
        }
    }
    calculateNextDueDate(currentDate, frequency) {
        const nextDate = new Date(currentDate);
        switch (frequency) {
            case 'DAILY':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'WEEKLY':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'MONTHLY':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'YEARLY':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        return nextDate;
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=transactions.service.js.map