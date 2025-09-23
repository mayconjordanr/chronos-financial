import { describe, beforeAll, beforeEach, afterAll, afterEach, it, expect, jest } from '@jest/globals';
import { PrismaClient, AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountService, CreateAccountData, UpdateAccountData } from './accounts.service';

// Mock Prisma Client
const mockPrisma = {
  account: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  user: {
    findFirst: jest.fn()
  },
  $transaction: jest.fn()
} as any;

describe('Accounts Module - TDD Test Suite', () => {
  let accountService: AccountService;
  const mockTenantId = 'tenant_123';
  const mockUserId = 'user_123';
  const mockAccountId = 'account_123';
  const mockTenantId2 = 'tenant_456';
  const mockUserId2 = 'user_456';

  beforeAll(() => {
    accountService = new AccountService(mockPrisma as PrismaClient);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations with Tenant Isolation', () => {
    describe('createAccount', () => {
      const mockAccountData: CreateAccountData = {
        name: 'Primary Checking',
        type: AccountType.CHECKING,
        balance: new Decimal('1000.00'),
        currency: 'USD',
        description: 'Main checking account'
      };

      it('should create account with valid data and tenant isolation', async () => {
        // Mock user validation
        mockPrisma.user.findFirst.mockResolvedValue({
          id: mockUserId,
          tenantId: mockTenantId,
          isActive: true
        });

        // Mock account creation
        const mockCreatedAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          name: 'Primary Checking',
          type: AccountType.CHECKING,
          balance: new Decimal('1000.00'),
          currency: 'USD',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        mockPrisma.account.create.mockResolvedValue(mockCreatedAccount);

        const result = await accountService.createAccount(mockAccountData, mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Account created successfully');
        expect(result.account).toEqual(mockCreatedAccount);

        // Verify user validation with tenant isolation
        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockUserId,
            tenantId: mockTenantId,
            isActive: true
          }
        });

        // Verify account creation with tenant ID
        expect(mockPrisma.account.create).toHaveBeenCalledWith({
          data: {
            tenantId: mockTenantId,
            userId: mockUserId,
            name: 'Primary Checking',
            type: AccountType.CHECKING,
            balance: new Decimal('1000.00'),
            currency: 'USD',
            description: 'Main checking account',
            isActive: true
          }
        });
      });

      it('should reject account creation if user does not belong to tenant', async () => {
        // Mock user not found in tenant
        mockPrisma.user.findFirst.mockResolvedValue(null);

        const result = await accountService.createAccount(mockAccountData, mockUserId, mockTenantId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('User not found in this tenant');
        expect(result.account).toBeUndefined();

        // Verify user validation with tenant isolation
        expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockUserId,
            tenantId: mockTenantId,
            isActive: true
          }
        });

        expect(mockPrisma.account.create).not.toHaveBeenCalled();
      });

      it('should validate required fields', async () => {
        const invalidData = {
          name: '',
          type: AccountType.CHECKING,
          balance: new Decimal('0'),
          currency: 'USD'
        } as CreateAccountData;

        mockPrisma.user.findFirst.mockResolvedValue({
          id: mockUserId,
          tenantId: mockTenantId,
          isActive: true
        });

        const result = await accountService.createAccount(invalidData, mockUserId, mockTenantId);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Account name is required');
      });

      it('should set default values correctly', async () => {
        const minimalData: CreateAccountData = {
          name: 'Savings Account',
          type: AccountType.SAVINGS
        };

        mockPrisma.user.findFirst.mockResolvedValue({
          id: mockUserId,
          tenantId: mockTenantId,
          isActive: true
        });

        const mockCreatedAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          name: 'Savings Account',
          type: AccountType.SAVINGS,
          balance: new Decimal('0'),
          currency: 'USD',
          isActive: true
        };

        mockPrisma.account.create.mockResolvedValue(mockCreatedAccount);

        const result = await accountService.createAccount(minimalData, mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(mockPrisma.account.create).toHaveBeenCalledWith({
          data: {
            tenantId: mockTenantId,
            userId: mockUserId,
            name: 'Savings Account',
            type: AccountType.SAVINGS,
            balance: new Decimal('0'),
            currency: 'USD',
            isActive: true
          }
        });
      });
    });

    describe('getAccounts', () => {
      it('should retrieve accounts with proper tenant isolation', async () => {
        const mockAccounts = [
          {
            id: 'account_1',
            tenantId: mockTenantId,
            userId: mockUserId,
            name: 'Checking',
            type: AccountType.CHECKING,
            balance: new Decimal('1000.00'),
            currency: 'USD',
            isActive: true
          },
          {
            id: 'account_2',
            tenantId: mockTenantId,
            userId: mockUserId,
            name: 'Savings',
            type: AccountType.SAVINGS,
            balance: new Decimal('5000.00'),
            currency: 'USD',
            isActive: true
          }
        ];

        mockPrisma.account.findMany.mockResolvedValue(mockAccounts);

        const result = await accountService.getAccounts(mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Accounts retrieved successfully');
        expect(result.accounts).toEqual(mockAccounts);

        // Verify tenant isolation in query
        expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
          where: {
            tenantId: mockTenantId,
            userId: mockUserId
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      });

      it('should filter accounts by type when specified', async () => {
        const filters = { type: AccountType.CHECKING };
        mockPrisma.account.findMany.mockResolvedValue([]);

        await accountService.getAccounts(mockUserId, mockTenantId, filters);

        expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
          where: {
            tenantId: mockTenantId,
            userId: mockUserId,
            type: AccountType.CHECKING
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      });

      it('should filter accounts by active status when specified', async () => {
        const filters = { isActive: true };
        mockPrisma.account.findMany.mockResolvedValue([]);

        await accountService.getAccounts(mockUserId, mockTenantId, filters);

        expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
          where: {
            tenantId: mockTenantId,
            userId: mockUserId,
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      });

      it('should return empty array when no accounts exist', async () => {
        mockPrisma.account.findMany.mockResolvedValue([]);

        const result = await accountService.getAccounts(mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(result.accounts).toEqual([]);
      });
    });

    describe('getAccount', () => {
      it('should retrieve single account with tenant and user validation', async () => {
        const mockAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          name: 'Primary Checking',
          type: AccountType.CHECKING,
          balance: new Decimal('1000.00'),
          currency: 'USD',
          isActive: true
        };

        mockPrisma.account.findFirst.mockResolvedValue(mockAccount);

        const result = await accountService.getAccount(mockAccountId, mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Account retrieved successfully');
        expect(result.account).toEqual(mockAccount);

        // Verify tenant and user isolation
        expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockAccountId,
            tenantId: mockTenantId,
            userId: mockUserId
          }
        });
      });

      it('should reject access to account from different tenant', async () => {
        mockPrisma.account.findFirst.mockResolvedValue(null);

        const result = await accountService.getAccount(mockAccountId, mockUserId, mockTenantId2);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Account not found or access denied');
        expect(result.account).toBeUndefined();

        // Verify query includes tenant isolation
        expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockAccountId,
            tenantId: mockTenantId2,
            userId: mockUserId
          }
        });
      });

      it('should reject access to account from different user', async () => {
        mockPrisma.account.findFirst.mockResolvedValue(null);

        const result = await accountService.getAccount(mockAccountId, mockUserId2, mockTenantId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Account not found or access denied');

        expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockAccountId,
            tenantId: mockTenantId,
            userId: mockUserId2
          }
        });
      });
    });

    describe('updateAccount', () => {
      const updateData: UpdateAccountData = {
        name: 'Updated Checking Account',
        description: 'Updated description'
      };

      it('should update account with tenant and user validation', async () => {
        const mockExistingAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          name: 'Primary Checking',
          type: AccountType.CHECKING,
          balance: new Decimal('1000.00')
        };

        const mockUpdatedAccount = {
          ...mockExistingAccount,
          name: 'Updated Checking Account',
          description: 'Updated description',
          updatedAt: new Date()
        };

        mockPrisma.account.findFirst.mockResolvedValue(mockExistingAccount);
        mockPrisma.account.update.mockResolvedValue(mockUpdatedAccount);

        const result = await accountService.updateAccount(mockAccountId, updateData, mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Account updated successfully');
        expect(result.account).toEqual(mockUpdatedAccount);

        // Verify tenant and user validation
        expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockAccountId,
            tenantId: mockTenantId,
            userId: mockUserId
          }
        });

        // Verify update call
        expect(mockPrisma.account.update).toHaveBeenCalledWith({
          where: { id: mockAccountId },
          data: {
            name: 'Updated Checking Account',
            description: 'Updated description',
            updatedAt: expect.any(Date)
          }
        });
      });

      it('should reject update for non-existent account', async () => {
        mockPrisma.account.findFirst.mockResolvedValue(null);

        const result = await accountService.updateAccount(mockAccountId, updateData, mockUserId, mockTenantId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Account not found or access denied');
        expect(mockPrisma.account.update).not.toHaveBeenCalled();
      });

      it('should not allow updating account type or balance directly', async () => {
        const invalidUpdateData = {
          type: AccountType.SAVINGS,
          balance: new Decimal('2000.00')
        } as any;

        const mockExistingAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId
        };

        mockPrisma.account.findFirst.mockResolvedValue(mockExistingAccount);

        const result = await accountService.updateAccount(mockAccountId, invalidUpdateData, mockUserId, mockTenantId);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Cannot update account type or balance directly');
      });
    });

    describe('deleteAccount', () => {
      it('should delete account with tenant and user validation', async () => {
        const mockAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          name: 'Account to Delete'
        };

        mockPrisma.account.findFirst.mockResolvedValue(mockAccount);
        mockPrisma.account.update.mockResolvedValue({ ...mockAccount, isActive: false });

        const result = await accountService.deleteAccount(mockAccountId, mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Account deleted successfully');

        // Verify tenant and user validation
        expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockAccountId,
            tenantId: mockTenantId,
            userId: mockUserId
          }
        });

        // Verify soft delete (deactivation)
        expect(mockPrisma.account.update).toHaveBeenCalledWith({
          where: { id: mockAccountId },
          data: {
            isActive: false,
            updatedAt: expect.any(Date)
          }
        });
      });

      it('should reject deletion for non-existent account', async () => {
        mockPrisma.account.findFirst.mockResolvedValue(null);

        const result = await accountService.deleteAccount(mockAccountId, mockUserId, mockTenantId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Account not found or access denied');
        expect(mockPrisma.account.update).not.toHaveBeenCalled();
      });

      it('should prevent deletion if account has non-zero balance', async () => {
        const mockAccountWithBalance = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          balance: new Decimal('500.00')
        };

        mockPrisma.account.findFirst.mockResolvedValue(mockAccountWithBalance);

        const result = await accountService.deleteAccount(mockAccountId, mockUserId, mockTenantId);

        expect(result.success).toBe(false);
        expect(result.message).toBe('Cannot delete account with non-zero balance');
        expect(mockPrisma.account.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('Account Types and Validation', () => {
    it('should accept all valid account types', async () => {
      const validTypes = [
        AccountType.CHECKING,
        AccountType.SAVINGS,
        AccountType.CREDIT_CARD,
        AccountType.INVESTMENT
      ];

      mockPrisma.user.findFirst.mockResolvedValue({
        id: mockUserId,
        tenantId: mockTenantId,
        isActive: true
      });

      for (const type of validTypes) {
        mockPrisma.account.create.mockResolvedValue({
          id: `account_${type}`,
          type,
          tenantId: mockTenantId,
          userId: mockUserId
        });

        const accountData: CreateAccountData = {
          name: `${type} Account`,
          type,
          balance: new Decimal('100.00')
        };

        const result = await accountService.createAccount(accountData, mockUserId, mockTenantId);
        expect(result.success).toBe(true);
      }
    });

    it('should validate account name length', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: mockUserId,
        tenantId: mockTenantId,
        isActive: true
      });

      const longName = 'A'.repeat(256); // Assuming max length is 255
      const accountData: CreateAccountData = {
        name: longName,
        type: AccountType.CHECKING
      };

      const result = await accountService.createAccount(accountData, mockUserId, mockTenantId);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Account name is too long');
    });

    it('should validate balance for different account types', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: mockUserId,
        tenantId: mockTenantId,
        isActive: true
      });

      // Credit card accounts should allow negative balances
      const creditCardData: CreateAccountData = {
        name: 'Credit Card',
        type: AccountType.CREDIT_CARD,
        balance: new Decimal('-500.00')
      };

      mockPrisma.account.create.mockResolvedValue({
        id: 'cc_account',
        ...creditCardData,
        tenantId: mockTenantId,
        userId: mockUserId
      });

      const result = await accountService.createAccount(creditCardData, mockUserId, mockTenantId);
      expect(result.success).toBe(true);
    });

    it('should validate currency format', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: mockUserId,
        tenantId: mockTenantId,
        isActive: true
      });

      const accountData: CreateAccountData = {
        name: 'Test Account',
        type: AccountType.CHECKING,
        currency: 'INVALID'
      };

      const result = await accountService.createAccount(accountData, mockUserId, mockTenantId);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid currency format');
    });
  });

  describe('Balance Management', () => {
    describe('updateBalance', () => {
      it('should update balance with database transaction', async () => {
        const mockAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          balance: new Decimal('1000.00')
        };

        const mockTransaction = jest.fn();
        mockPrisma.$transaction.mockImplementation(mockTransaction);

        mockTransaction.mockImplementation(async (callback) => {
          const mockTx = {
            account: {
              findFirst: jest.fn().mockResolvedValue(mockAccount),
              update: jest.fn().mockResolvedValue({
                ...mockAccount,
                balance: new Decimal('1500.00')
              })
            },
            balanceHistory: {
              create: jest.fn().mockResolvedValue({})
            }
          };
          return await callback(mockTx);
        });

        const result = await accountService.updateBalance(
          mockAccountId,
          new Decimal('500.00'),
          mockUserId,
          mockTenantId
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('Balance updated successfully');
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });

      it('should create balance history entry', async () => {
        const mockAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          balance: new Decimal('1000.00')
        };

        const mockTx = {
          account: {
            findFirst: jest.fn().mockResolvedValue(mockAccount),
            update: jest.fn().mockResolvedValue({
              ...mockAccount,
              balance: new Decimal('1500.00')
            })
          },
          balanceHistory: {
            create: jest.fn().mockResolvedValue({})
          }
        };

        mockPrisma.$transaction.mockImplementation(async (callback) => {
          return await callback(mockTx);
        });

        await accountService.updateBalance(
          mockAccountId,
          new Decimal('500.00'),
          mockUserId,
          mockTenantId
        );

        expect(mockTx.balanceHistory.create).toHaveBeenCalledWith({
          data: {
            accountId: mockAccountId,
            tenantId: mockTenantId,
            previousBalance: new Decimal('1000.00'),
            newBalance: new Decimal('1500.00'),
            change: new Decimal('500.00'),
            timestamp: expect.any(Date)
          }
        });
      });

      it('should prevent balance updates for accounts from different tenants', async () => {
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const mockTx = {
            account: {
              findFirst: jest.fn().mockResolvedValue(null)
            }
          };
          return await callback(mockTx);
        });

        const result = await accountService.updateBalance(
          mockAccountId,
          new Decimal('500.00'),
          mockUserId,
          mockTenantId2
        );

        expect(result.success).toBe(false);
        expect(result.message).toBe('Account not found or access denied');
      });

      it('should handle concurrent balance updates correctly', async () => {
        // This test would be more complex in a real implementation
        // involving actual database transactions and concurrency testing
        const mockAccount = {
          id: mockAccountId,
          tenantId: mockTenantId,
          userId: mockUserId,
          balance: new Decimal('1000.00')
        };

        let callCount = 0;
        mockPrisma.$transaction.mockImplementation(async (callback) => {
          const mockTx = {
            account: {
              findFirst: jest.fn().mockResolvedValue(mockAccount),
              update: jest.fn().mockImplementation(({ data }) => {
                callCount++;
                return Promise.resolve({
                  ...mockAccount,
                  balance: mockAccount.balance.add(data.balance.increment || new Decimal('0'))
                });
              })
            },
            balanceHistory: {
              create: jest.fn().mockResolvedValue({})
            }
          };
          return await callback(mockTx);
        });

        // Simulate concurrent updates
        const updates = [
          accountService.updateBalance(mockAccountId, new Decimal('100.00'), mockUserId, mockTenantId),
          accountService.updateBalance(mockAccountId, new Decimal('200.00'), mockUserId, mockTenantId)
        ];

        const results = await Promise.all(updates);

        results.forEach(result => {
          expect(result.success).toBe(true);
        });

        expect(callCount).toBe(2);
      });
    });

    describe('getBalanceHistory', () => {
      it('should retrieve balance history with tenant isolation', async () => {
        const mockHistory = [
          {
            id: 'history_1',
            accountId: mockAccountId,
            tenantId: mockTenantId,
            previousBalance: new Decimal('1000.00'),
            newBalance: new Decimal('1500.00'),
            change: new Decimal('500.00'),
            timestamp: new Date()
          }
        ];

        mockPrisma.balanceHistory = {
          findMany: jest.fn().mockResolvedValue(mockHistory)
        };

        const result = await accountService.getBalanceHistory(mockAccountId, mockUserId, mockTenantId);

        expect(result.success).toBe(true);
        expect(result.history).toEqual(mockHistory);

        expect(mockPrisma.balanceHistory.findMany).toHaveBeenCalledWith({
          where: {
            accountId: mockAccountId,
            tenantId: mockTenantId,
            account: {
              userId: mockUserId
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const accountData: CreateAccountData = {
        name: 'Test Account',
        type: AccountType.CHECKING
      };

      const result = await accountService.createAccount(accountData, mockUserId, mockTenantId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to create account');
    });

    it('should handle validation errors with detailed messages', async () => {
      const accountData: CreateAccountData = {
        name: '',
        type: null as any
      };

      mockPrisma.user.findFirst.mockResolvedValue({
        id: mockUserId,
        tenantId: mockTenantId,
        isActive: true
      });

      const result = await accountService.createAccount(accountData, mockUserId, mockTenantId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('validation');
    });

    it('should handle unique constraint violations', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: mockUserId,
        tenantId: mockTenantId,
        isActive: true
      });

      mockPrisma.account.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['tenantId', 'userId', 'name'] }
      });

      const accountData: CreateAccountData = {
        name: 'Duplicate Account',
        type: AccountType.CHECKING
      };

      const result = await accountService.createAccount(accountData, mockUserId, mockTenantId);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already exists');
    });
  });
});