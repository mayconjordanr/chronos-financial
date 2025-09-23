import { PrismaClient, Account, AccountType, User } from '@prisma/client';
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

export class AccountService {
  // Supported currencies
  private readonly SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK', 'NZD', 'BRL'
  ];

  // Account name constraints
  private readonly MAX_NAME_LENGTH = 255;
  private readonly MIN_NAME_LENGTH = 1;

  constructor(private prisma: PrismaClient) {}

  async createAccount(
    data: CreateAccountData,
    userId: string,
    tenantId: string
  ): Promise<AccountResult> {
    try {
      // Validate input data
      const validationError = this.validateAccountData(data);
      if (validationError) {
        return {
          success: false,
          message: validationError
        };
      }

      // CRITICAL: Validate user belongs to tenant
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          tenantId, // CRITICAL: Tenant isolation
          isActive: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found in this tenant'
        };
      }

      // Set defaults
      const accountData = {
        tenantId, // CRITICAL: Always include tenant ID
        userId,
        name: data.name.trim(),
        type: data.type,
        balance: data.balance || new Decimal('0'),
        currency: data.currency || 'USD',
        description: data.description?.trim() || null,
        bankName: data.bankName?.trim() || null,
        accountNumber: data.accountNumber?.trim() || null,
        routingNumber: data.routingNumber?.trim() || null,
        isActive: true
      };

      // Check for duplicate account names within tenant and user
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

      // Create the account
      const account = await this.prisma.account.create({
        data: accountData
      });

      return {
        success: true,
        message: 'Account created successfully',
        account
      };
    } catch (error) {
      console.error('Error creating account:', error);

      // Handle specific database errors
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

  async getAccounts(
    userId: string,
    tenantId: string,
    filters?: AccountFilters,
    pagination?: PaginationOptions
  ): Promise<AccountsResult> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const skip = (page - 1) * limit;
      const sortBy = pagination?.sortBy || 'createdAt';
      const sortOrder = pagination?.sortOrder || 'desc';

      // Build where clause with tenant isolation
      const where: any = {
        tenantId, // CRITICAL: Tenant isolation
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

      // Get accounts with pagination
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
    } catch (error) {
      console.error('Error getting accounts:', error);
      return {
        success: false,
        message: 'Failed to retrieve accounts'
      };
    }
  }

  async getAccount(
    accountId: string,
    userId: string,
    tenantId: string
  ): Promise<AccountResult> {
    try {
      // CRITICAL: Always include tenantId and userId in query
      const account = await this.prisma.account.findFirst({
        where: {
          id: accountId,
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

      return {
        success: true,
        message: 'Account retrieved successfully',
        account
      };
    } catch (error) {
      console.error('Error getting account:', error);
      return {
        success: false,
        message: 'Failed to retrieve account'
      };
    }
  }

  async updateAccount(
    accountId: string,
    data: UpdateAccountData,
    userId: string,
    tenantId: string
  ): Promise<AccountResult> {
    try {
      // Validate update data
      const validationError = this.validateUpdateData(data);
      if (validationError) {
        return {
          success: false,
          message: validationError
        };
      }

      // CRITICAL: Validate account exists and belongs to tenant/user
      const existingAccount = await this.prisma.account.findFirst({
        where: {
          id: accountId,
          tenantId, // CRITICAL: Tenant isolation
          userId
        }
      });

      if (!existingAccount) {
        return {
          success: false,
          message: 'Account not found or access denied'
        };
      }

      // Check for duplicate name if name is being updated
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

      // Prepare update data
      const updateData: any = {
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

      // Update the account
      const updatedAccount = await this.prisma.account.update({
        where: { id: accountId },
        data: updateData
      });

      return {
        success: true,
        message: 'Account updated successfully',
        account: updatedAccount
      };
    } catch (error) {
      console.error('Error updating account:', error);
      return {
        success: false,
        message: 'Failed to update account'
      };
    }
  }

  async deleteAccount(
    accountId: string,
    userId: string,
    tenantId: string
  ): Promise<AccountResult> {
    try {
      // CRITICAL: Validate account exists and belongs to tenant/user
      const existingAccount = await this.prisma.account.findFirst({
        where: {
          id: accountId,
          tenantId, // CRITICAL: Tenant isolation
          userId
        }
      });

      if (!existingAccount) {
        return {
          success: false,
          message: 'Account not found or access denied'
        };
      }

      // Prevent deletion if account has non-zero balance
      if (!existingAccount.balance.equals(new Decimal('0'))) {
        return {
          success: false,
          message: 'Cannot delete account with non-zero balance'
        };
      }

      // Check if account has any transactions
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

      // Soft delete (deactivate) the account
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
    } catch (error) {
      console.error('Error deleting account:', error);
      return {
        success: false,
        message: 'Failed to delete account'
      };
    }
  }

  async updateBalance(
    accountId: string,
    amount: Decimal,
    userId: string,
    tenantId: string,
    description?: string
  ): Promise<BalanceUpdateResult> {
    try {
      // Use database transaction for atomic balance update
      const result = await this.prisma.$transaction(async (tx) => {
        // CRITICAL: Validate account exists and belongs to tenant/user
        const account = await tx.account.findFirst({
          where: {
            id: accountId,
            tenantId, // CRITICAL: Tenant isolation
            userId
          }
        });

        if (!account) {
          throw new Error('Account not found or access denied');
        }

        const previousBalance = account.balance;
        const newBalance = previousBalance.add(amount);

        // Update account balance
        const updatedAccount = await tx.account.update({
          where: { id: accountId },
          data: {
            balance: newBalance,
            updatedAt: new Date()
          }
        });

        // Create balance history entry (if table exists)
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
        } catch (historyError) {
          // Balance history table might not exist yet - log but don't fail
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
    } catch (error) {
      console.error('Error updating balance:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update balance'
      };
    }
  }

  async getBalanceHistory(
    accountId: string,
    userId: string,
    tenantId: string,
    pagination?: PaginationOptions
  ): Promise<BalanceHistoryResult> {
    try {
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 50;
      const skip = (page - 1) * limit;

      // CRITICAL: Validate access through account ownership
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

      let history: BalanceHistory[] = [];

      try {
        // Get balance history with tenant isolation
        history = await this.prisma.balanceHistory.findMany({
          where: {
            accountId,
            tenantId, // CRITICAL: Tenant isolation
            account: {
              userId // CRITICAL: User ownership validation
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          skip: limit > 0 ? skip : undefined,
          take: limit > 0 ? limit : undefined
        });
      } catch (error) {
        // Balance history table might not exist yet
        console.warn('Balance history table not available:', error);
      }

      return {
        success: true,
        message: 'Balance history retrieved successfully',
        history
      };
    } catch (error) {
      console.error('Error getting balance history:', error);
      return {
        success: false,
        message: 'Failed to retrieve balance history'
      };
    }
  }

  async getAccountSummary(
    userId: string,
    tenantId: string
  ): Promise<{
    success: boolean;
    message: string;
    summary?: {
      totalAccounts: number;
      activeAccounts: number;
      totalBalance: Decimal;
      balanceByType: Record<string, Decimal>;
      balanceByCurrency: Record<string, Decimal>;
    };
  }> {
    try {
      // Get all accounts with tenant isolation
      const accounts = await this.prisma.account.findMany({
        where: {
          tenantId, // CRITICAL: Tenant isolation
          userId
        }
      });

      const totalAccounts = accounts.length;
      const activeAccounts = accounts.filter(a => a.isActive).length;

      // Calculate totals (convert everything to USD for total - simplified)
      let totalBalance = new Decimal('0');
      const balanceByType: Record<string, Decimal> = {};
      const balanceByCurrency: Record<string, Decimal> = {};

      for (const account of accounts) {
        if (!account.isActive) continue;

        // Add to type summary
        const typeKey = account.type;
        balanceByType[typeKey] = (balanceByType[typeKey] || new Decimal('0')).add(account.balance);

        // Add to currency summary
        const currencyKey = account.currency;
        balanceByCurrency[currencyKey] = (balanceByCurrency[currencyKey] || new Decimal('0')).add(account.balance);

        // Add to total (simplified - assumes USD or converts at 1:1)
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
    } catch (error) {
      console.error('Error getting account summary:', error);
      return {
        success: false,
        message: 'Failed to retrieve account summary'
      };
    }
  }

  private validateAccountData(data: CreateAccountData): string | null {
    if (!data.name || data.name.trim().length === 0) {
      return 'Account name is required';
    }

    if (data.name.trim().length > this.MAX_NAME_LENGTH) {
      return 'Account name is too long';
    }

    if (!data.type || !Object.values(AccountType).includes(data.type)) {
      return 'Valid account type is required';
    }

    if (data.balance && data.balance.lessThan(new Decimal('-999999999999.99'))) {
      return 'Balance cannot be less than minimum allowed value';
    }

    if (data.balance && data.balance.greaterThan(new Decimal('999999999999.99'))) {
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

  private validateUpdateData(data: UpdateAccountData): string | null {
    // Check for disallowed update fields
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