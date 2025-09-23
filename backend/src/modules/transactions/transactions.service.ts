import { PrismaClient, Transaction, TransactionType, RecurringTransaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateTransactionData {
  accountId: string;
  categoryId?: string;
  toAccountId?: string; // For transfers
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

export class TransactionService {
  constructor(private prisma: PrismaClient) {}

  async createTransaction(
    data: CreateTransactionData,
    userId: string,
    tenantId: string
  ): Promise<TransactionResult> {
    try {
      // Use database transaction for atomic operation
      const result = await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate account exists and belongs to tenant
        const account = await tx.account.findFirst({
          where: {
            id: data.accountId,
            tenantId, // CRITICAL: Tenant isolation
            userId
          }
        });

        if (!account) {
          throw new Error('Account not found or access denied');
        }

        // CRITICAL: Validate category if provided
        if (data.categoryId) {
          const category = await tx.category.findFirst({
            where: {
              id: data.categoryId,
              tenantId // CRITICAL: Tenant isolation
            }
          });

          if (!category) {
            throw new Error('Category not found or access denied');
          }
        }

        // CRITICAL: Validate destination account for transfers
        let toAccount = null;
        if (data.type === TransactionType.TRANSFER && data.toAccountId) {
          toAccount = await tx.account.findFirst({
            where: {
              id: data.toAccountId,
              tenantId, // CRITICAL: Tenant isolation
              userId
            }
          });

          if (!toAccount) {
            throw new Error('Destination account not found or access denied');
          }
        }

        // Create the transaction
        const transaction = await tx.transaction.create({
          data: {
            tenantId, // CRITICAL: Always include tenant ID
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

        // Update account balances atomically
        if (data.type === TransactionType.INCOME) {
          // Increase account balance for income
          await tx.account.update({
            where: { id: data.accountId },
            data: {
              balance: {
                increment: data.amount
              }
            }
          });
        } else if (data.type === TransactionType.EXPENSE) {
          // Decrease account balance for expense
          await tx.account.update({
            where: { id: data.accountId },
            data: {
              balance: {
                decrement: data.amount
              }
            }
          });
        } else if (data.type === TransactionType.TRANSFER && data.toAccountId) {
          // For transfers: decrease from account, increase to account
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
    } catch (error) {
      console.error('Error creating transaction:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create transaction'
      };
    }
  }

  async getTransactions(
    userId: string,
    tenantId: string,
    filters?: TransactionFilters,
    pagination?: PaginationOptions
  ): Promise<TransactionsResult> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const skip = (page - 1) * limit;
      const sortBy = pagination?.sortBy || 'date';
      const sortOrder = pagination?.sortOrder || 'desc';

      // Build where clause with tenant isolation
      const where: any = {
        tenantId, // CRITICAL: Tenant isolation
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

      // Get transactions with relations
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
    } catch (error) {
      console.error('Error getting transactions:', error);
      return {
        success: false,
        message: 'Failed to retrieve transactions'
      };
    }
  }

  async getTransaction(
    transactionId: string,
    userId: string,
    tenantId: string
  ): Promise<TransactionResult> {
    try {
      // CRITICAL: Always include tenantId in query
      const transaction = await this.prisma.transaction.findFirst({
        where: {
          id: transactionId,
          tenantId, // CRITICAL: Tenant isolation
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
    } catch (error) {
      console.error('Error getting transaction:', error);
      return {
        success: false,
        message: 'Failed to retrieve transaction'
      };
    }
  }

  async updateTransaction(
    transactionId: string,
    data: UpdateTransactionData,
    userId: string,
    tenantId: string
  ): Promise<TransactionResult> {
    try {
      // Use database transaction for atomic operation
      const result = await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate transaction exists and belongs to tenant
        const existingTransaction = await tx.transaction.findFirst({
          where: {
            id: transactionId,
            tenantId, // CRITICAL: Tenant isolation
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

        // CRITICAL: Validate category if being updated
        if (data.categoryId) {
          const category = await tx.category.findFirst({
            where: {
              id: data.categoryId,
              tenantId // CRITICAL: Tenant isolation
            }
          });

          if (!category) {
            throw new Error('Category not found or access denied');
          }
        }

        // Reverse the original balance changes
        await this.reverseBalanceChanges(tx, existingTransaction);

        // Update the transaction
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

        // Apply new balance changes
        await this.applyBalanceChanges(tx, updatedTransaction);

        return updatedTransaction;
      });

      return {
        success: true,
        message: 'Transaction updated successfully',
        transaction: result
      };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update transaction'
      };
    }
  }

  async deleteTransaction(
    transactionId: string,
    userId: string,
    tenantId: string
  ): Promise<TransactionResult> {
    try {
      // Use database transaction for atomic operation
      const result = await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate transaction exists and belongs to tenant
        const existingTransaction = await tx.transaction.findFirst({
          where: {
            id: transactionId,
            tenantId, // CRITICAL: Tenant isolation
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

        // Reverse the balance changes
        await this.reverseBalanceChanges(tx, existingTransaction);

        // Delete the transaction
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
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete transaction'
      };
    }
  }

  async createRecurringTransaction(
    data: CreateRecurringTransactionData,
    userId: string,
    tenantId: string
  ): Promise<RecurringTransactionResult> {
    try {
      // CRITICAL: Validate account exists and belongs to tenant
      const account = await this.prisma.account.findFirst({
        where: {
          id: data.accountId,
          tenantId, // CRITICAL: Tenant isolation
          userId
        }
      });

      if (!account) {
        return {
          success: false,
          message: 'Account not found or access denied'
        };
      }

      // CRITICAL: Validate category if provided
      if (data.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: {
            id: data.categoryId,
            tenantId // CRITICAL: Tenant isolation
          }
        });

        if (!category) {
          return {
            success: false,
            message: 'Category not found or access denied'
          };
        }
      }

      // CRITICAL: Validate destination account for transfers
      if (data.type === TransactionType.TRANSFER && data.toAccountId) {
        const toAccount = await this.prisma.account.findFirst({
          where: {
            id: data.toAccountId,
            tenantId, // CRITICAL: Tenant isolation
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
          tenantId, // CRITICAL: Always include tenant ID
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
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      return {
        success: false,
        message: 'Failed to create recurring transaction'
      };
    }
  }

  async generateRecurringTransactions(
    userId: string,
    tenantId: string
  ): Promise<GenerateRecurringResult> {
    try {
      let generatedCount = 0;

      // CRITICAL: Get recurring transactions for tenant only
      const recurringTransactions = await this.prisma.recurringTransaction.findMany({
        where: {
          tenantId, // CRITICAL: Tenant isolation
          userId,
          isActive: true,
          nextDueDate: {
            lte: new Date()
          }
        }
      });

      for (const recurring of recurringTransactions) {
        // Skip if end date has passed
        if (recurring.endDate && recurring.endDate < new Date()) {
          await this.prisma.recurringTransaction.update({
            where: { id: recurring.id },
            data: { isActive: false }
          });
          continue;
        }

        // Create the transaction
        const transactionData: CreateTransactionData = {
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

          // Calculate next due date
          const nextDueDate = this.calculateNextDueDate(
            recurring.nextDueDate,
            recurring.frequency
          );

          // Update recurring transaction
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
    } catch (error) {
      console.error('Error generating recurring transactions:', error);
      return {
        success: false,
        message: 'Failed to generate recurring transactions'
      };
    }
  }

  private async reverseBalanceChanges(tx: any, transaction: Transaction): Promise<void> {
    if (transaction.type === TransactionType.INCOME) {
      // Reverse income: decrease balance
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            decrement: transaction.amount
          }
        }
      });
    } else if (transaction.type === TransactionType.EXPENSE) {
      // Reverse expense: increase balance
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: transaction.amount
          }
        }
      });
    } else if (transaction.type === TransactionType.TRANSFER && transaction.toAccountId) {
      // Reverse transfer: increase from account, decrease to account
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

  private async applyBalanceChanges(tx: any, transaction: Transaction): Promise<void> {
    if (transaction.type === TransactionType.INCOME) {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: transaction.amount
          }
        }
      });
    } else if (transaction.type === TransactionType.EXPENSE) {
      await tx.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            decrement: transaction.amount
          }
        }
      });
    } else if (transaction.type === TransactionType.TRANSFER && transaction.toAccountId) {
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

  private calculateNextDueDate(currentDate: Date, frequency: string): Date {
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