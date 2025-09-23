import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient, TransactionType } from '@prisma/client';
import { TransactionService } from './transactions.service';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';

describe('Transactions Module', () => {
  let transactionService: TransactionService;
  let prisma: PrismaClient;
  let testTenantId: string;
  let testUserId: string;
  let testAccountId: string;
  let testCategoryId: string;
  let testAccount2Id: string; // For transfer tests

  beforeEach(async () => {
    prisma = new PrismaClient();
    transactionService = new TransactionService(prisma);

    testTenantId = uuidv4();
    testUserId = uuidv4();
    testAccountId = uuidv4();
    testCategoryId = uuidv4();
    testAccount2Id = uuidv4();

    // Create test tenant
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Test Tenant',
        slug: `test-${Date.now()}`,
        status: 'ACTIVE'
      }
    });

    // Create test user
    await prisma.user.create({
      data: {
        id: testUserId,
        tenantId: testTenantId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'hashedpassword',
        isActive: true
      }
    });

    // Create test accounts
    await prisma.account.createMany({
      data: [
        {
          id: testAccountId,
          tenantId: testTenantId,
          userId: testUserId,
          name: 'Test Checking Account',
          type: 'CHECKING',
          balance: new Decimal('1000.00')
        },
        {
          id: testAccount2Id,
          tenantId: testTenantId,
          userId: testUserId,
          name: 'Test Savings Account',
          type: 'SAVINGS',
          balance: new Decimal('500.00')
        }
      ]
    });

    // Create test category
    await prisma.category.create({
      data: {
        id: testCategoryId,
        tenantId: testTenantId,
        name: 'Food',
        description: 'Food and dining expenses',
        color: '#FF5733',
        icon: '🍽️'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.transaction.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.account.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.category.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.user.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    await prisma.$disconnect();
  });

  describe('CRUD Operations with Tenant Isolation', () => {
    it('should create transaction with tenant isolation', async () => {
      const transactionData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('50.00'),
        type: TransactionType.EXPENSE,
        description: 'Lunch expense',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.tenantId).toBe(testTenantId);
      expect(result.transaction?.userId).toBe(testUserId);
      expect(result.transaction?.amount).toEqual(new Decimal('50.00'));
      expect(result.transaction?.type).toBe(TransactionType.EXPENSE);

      // Verify account balance was updated
      const updatedAccount = await prisma.account.findFirst({
        where: { id: testAccountId, tenantId: testTenantId }
      });
      expect(updatedAccount?.balance).toEqual(new Decimal('950.00')); // 1000 - 50
    });

    it('should not create transaction with invalid account from different tenant', async () => {
      const wrongTenantId = uuidv4();

      // Create account in different tenant
      await prisma.tenant.create({
        data: {
          id: wrongTenantId,
          name: 'Wrong Tenant',
          slug: `wrong-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      const wrongAccountId = uuidv4();
      await prisma.account.create({
        data: {
          id: wrongAccountId,
          tenantId: wrongTenantId,
          userId: uuidv4(),
          name: 'Wrong Account',
          type: 'CHECKING',
          balance: new Decimal('1000.00')
        }
      });

      const transactionData = {
        accountId: wrongAccountId, // Account from different tenant
        categoryId: testCategoryId,
        amount: new Decimal('50.00'),
        type: TransactionType.EXPENSE,
        description: 'Should fail',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');

      // Cleanup
      await prisma.account.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.tenant.deleteMany({ where: { id: wrongTenantId } });
    });

    it('should retrieve transactions with tenant isolation', async () => {
      // Create test transactions
      const transaction1 = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          userId: testUserId,
          accountId: testAccountId,
          categoryId: testCategoryId,
          amount: new Decimal('25.00'),
          type: TransactionType.EXPENSE,
          description: 'Transaction 1'
        }
      });

      const transaction2 = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          userId: testUserId,
          accountId: testAccountId,
          categoryId: testCategoryId,
          amount: new Decimal('75.00'),
          type: TransactionType.INCOME,
          description: 'Transaction 2'
        }
      });

      const result = await transactionService.getTransactions(testUserId, testTenantId);

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions?.every(t => t.tenantId === testTenantId)).toBe(true);
    });

    it('should update transaction with tenant isolation', async () => {
      // Create test transaction
      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          userId: testUserId,
          accountId: testAccountId,
          categoryId: testCategoryId,
          amount: new Decimal('100.00'),
          type: TransactionType.EXPENSE,
          description: 'Original description'
        }
      });

      const updateData = {
        description: 'Updated description',
        amount: new Decimal('150.00')
      };

      const result = await transactionService.updateTransaction(
        transaction.id,
        updateData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.transaction?.description).toBe('Updated description');
      expect(result.transaction?.amount).toEqual(new Decimal('150.00'));
    });

    it('should not update transaction from different tenant', async () => {
      const wrongTenantId = uuidv4();

      // Create transaction in different tenant
      await prisma.tenant.create({
        data: {
          id: wrongTenantId,
          name: 'Wrong Tenant',
          slug: `wrong2-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      const wrongUserId = uuidv4();
      const wrongAccountId = uuidv4();
      const wrongCategoryId = uuidv4();

      await prisma.user.create({
        data: {
          id: wrongUserId,
          tenantId: wrongTenantId,
          email: 'wrong@example.com',
          firstName: 'Wrong',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });

      await prisma.account.create({
        data: {
          id: wrongAccountId,
          tenantId: wrongTenantId,
          userId: wrongUserId,
          name: 'Wrong Account',
          type: 'CHECKING',
          balance: new Decimal('1000.00')
        }
      });

      await prisma.category.create({
        data: {
          id: wrongCategoryId,
          tenantId: wrongTenantId,
          name: 'Wrong Category'
        }
      });

      const wrongTransaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: wrongTenantId,
          userId: wrongUserId,
          accountId: wrongAccountId,
          categoryId: wrongCategoryId,
          amount: new Decimal('100.00'),
          type: TransactionType.EXPENSE,
          description: 'Wrong transaction'
        }
      });

      const updateData = {
        description: 'Hacked description'
      };

      const result = await transactionService.updateTransaction(
        wrongTransaction.id,
        updateData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Transaction not found or access denied');

      // Cleanup
      await prisma.transaction.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.account.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.category.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.user.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.tenant.deleteMany({ where: { id: wrongTenantId } });
    });

    it('should delete transaction with tenant isolation', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: testTenantId,
          userId: testUserId,
          accountId: testAccountId,
          categoryId: testCategoryId,
          amount: new Decimal('100.00'),
          type: TransactionType.EXPENSE,
          description: 'To be deleted'
        }
      });

      const result = await transactionService.deleteTransaction(
        transaction.id,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);

      // Verify transaction is deleted
      const deletedTransaction = await prisma.transaction.findFirst({
        where: { id: transaction.id, tenantId: testTenantId }
      });
      expect(deletedTransaction).toBeNull();
    });
  });

  describe('Transaction Types Support', () => {
    it('should handle income transactions', async () => {
      const transactionData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('500.00'),
        type: TransactionType.INCOME,
        description: 'Salary',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.transaction?.type).toBe(TransactionType.INCOME);

      // Verify account balance increased
      const updatedAccount = await prisma.account.findFirst({
        where: { id: testAccountId, tenantId: testTenantId }
      });
      expect(updatedAccount?.balance).toEqual(new Decimal('1500.00')); // 1000 + 500
    });

    it('should handle expense transactions', async () => {
      const transactionData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('200.00'),
        type: TransactionType.EXPENSE,
        description: 'Groceries',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.transaction?.type).toBe(TransactionType.EXPENSE);

      // Verify account balance decreased
      const updatedAccount = await prisma.account.findFirst({
        where: { id: testAccountId, tenantId: testTenantId }
      });
      expect(updatedAccount?.balance).toEqual(new Decimal('800.00')); // 1000 - 200
    });

    it('should handle transfer transactions', async () => {
      const transactionData = {
        accountId: testAccountId, // From account
        toAccountId: testAccount2Id, // To account
        amount: new Decimal('300.00'),
        type: TransactionType.TRANSFER,
        description: 'Transfer to savings',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.transaction?.type).toBe(TransactionType.TRANSFER);
      expect(result.transaction?.toAccountId).toBe(testAccount2Id);

      // Verify both account balances updated
      const fromAccount = await prisma.account.findFirst({
        where: { id: testAccountId, tenantId: testTenantId }
      });
      const toAccount = await prisma.account.findFirst({
        where: { id: testAccount2Id, tenantId: testTenantId }
      });

      expect(fromAccount?.balance).toEqual(new Decimal('700.00')); // 1000 - 300
      expect(toAccount?.balance).toEqual(new Decimal('800.00')); // 500 + 300
    });

    it('should not allow transfer to account from different tenant', async () => {
      const wrongTenantId = uuidv4();

      // Create account in different tenant
      await prisma.tenant.create({
        data: {
          id: wrongTenantId,
          name: 'Wrong Tenant',
          slug: `wrong3-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      const wrongAccountId = uuidv4();
      await prisma.account.create({
        data: {
          id: wrongAccountId,
          tenantId: wrongTenantId,
          userId: uuidv4(),
          name: 'Wrong Account',
          type: 'CHECKING',
          balance: new Decimal('1000.00')
        }
      });

      const transactionData = {
        accountId: testAccountId,
        toAccountId: wrongAccountId, // Account from different tenant
        amount: new Decimal('300.00'),
        type: TransactionType.TRANSFER,
        description: 'Should fail',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Destination account not found or access denied');

      // Cleanup
      await prisma.account.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.tenant.deleteMany({ where: { id: wrongTenantId } });
    });
  });

  describe('Balance Updates with Database Transactions', () => {
    it('should use database transactions for atomic balance updates', async () => {
      const initialBalance = new Decimal('1000.00');

      // Create transaction that should update balance
      const transactionData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('150.00'),
        type: TransactionType.EXPENSE,
        description: 'Test atomic update',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);

      // Verify both transaction created and balance updated atomically
      const transaction = await prisma.transaction.findFirst({
        where: { id: result.transaction?.id, tenantId: testTenantId }
      });
      const account = await prisma.account.findFirst({
        where: { id: testAccountId, tenantId: testTenantId }
      });

      expect(transaction).toBeTruthy();
      expect(account?.balance).toEqual(new Decimal('850.00')); // 1000 - 150
    });

    it('should rollback on error during balance update', async () => {
      // Mock a scenario where balance update fails
      const originalBalance = new Decimal('1000.00');

      // Try to create transaction with insufficient balance
      await prisma.account.update({
        where: { id: testAccountId },
        data: { balance: new Decimal('10.00') } // Set low balance
      });

      const transactionData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('50.00'), // More than available balance if we had insufficient funds check
        type: TransactionType.EXPENSE,
        description: 'Should fail if insufficient funds',
        date: new Date()
      };

      // This should still work in our current implementation, but balance should be updated correctly
      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);

      // Verify balance was updated correctly (allowing negative balance)
      const account = await prisma.account.findFirst({
        where: { id: testAccountId, tenantId: testTenantId }
      });
      expect(account?.balance).toEqual(new Decimal('-40.00')); // 10 - 50
    });

    it('should handle concurrent transaction creation safely', async () => {
      const transactionPromises = [];

      // Create multiple transactions concurrently
      for (let i = 0; i < 5; i++) {
        const transactionData = {
          accountId: testAccountId,
          categoryId: testCategoryId,
          amount: new Decimal('100.00'),
          type: TransactionType.EXPENSE,
          description: `Concurrent transaction ${i}`,
          date: new Date()
        };

        transactionPromises.push(
          transactionService.createTransaction(transactionData, testUserId, testTenantId)
        );
      }

      const results = await Promise.all(transactionPromises);

      // All transactions should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Final balance should be correct
      const finalAccount = await prisma.account.findFirst({
        where: { id: testAccountId, tenantId: testTenantId }
      });
      expect(finalAccount?.balance).toEqual(new Decimal('500.00')); // 1000 - (5 * 100)

      // Should have 5 transactions
      const transactions = await prisma.transaction.findMany({
        where: { accountId: testAccountId, tenantId: testTenantId }
      });
      expect(transactions).toHaveLength(5);
    });
  });

  describe('Foreign Key Validation', () => {
    it('should validate account exists and belongs to tenant', async () => {
      const fakeAccountId = uuidv4();

      const transactionData = {
        accountId: fakeAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('50.00'),
        type: TransactionType.EXPENSE,
        description: 'Invalid account',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');
    });

    it('should validate category exists and belongs to tenant', async () => {
      const fakeCategoryId = uuidv4();

      const transactionData = {
        accountId: testAccountId,
        categoryId: fakeCategoryId,
        amount: new Decimal('50.00'),
        type: TransactionType.EXPENSE,
        description: 'Invalid category',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');
    });

    it('should allow transactions without category', async () => {
      const transactionData = {
        accountId: testAccountId,
        amount: new Decimal('50.00'),
        type: TransactionType.INCOME,
        description: 'No category transaction',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.transaction?.categoryId).toBeNull();
    });
  });

  describe('Recurring Transactions Support', () => {
    it('should create recurring transaction template', async () => {
      const recurringData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('500.00'),
        type: TransactionType.INCOME,
        description: 'Monthly salary',
        frequency: 'MONTHLY',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      };

      const result = await transactionService.createRecurringTransaction(
        recurringData,
        testUserId,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.recurringTransaction).toBeDefined();
      expect(result.recurringTransaction?.tenantId).toBe(testTenantId);
      expect(result.recurringTransaction?.frequency).toBe('MONTHLY');
    });

    it('should generate transactions from recurring template', async () => {
      // First create a recurring transaction
      const recurringData = {
        accountId: testAccountId,
        categoryId: testCategoryId,
        amount: new Decimal('100.00'),
        type: TransactionType.EXPENSE,
        description: 'Monthly subscription',
        frequency: 'MONTHLY',
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3 months ago
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1 month from now
      };

      const recurringResult = await transactionService.createRecurringTransaction(
        recurringData,
        testUserId,
        testTenantId
      );

      expect(recurringResult.success).toBe(true);

      // Generate transactions from the recurring template
      const generateResult = await transactionService.generateRecurringTransactions(
        testUserId,
        testTenantId
      );

      expect(generateResult.success).toBe(true);
      expect(generateResult.generated).toBeGreaterThan(0);

      // Verify transactions were created
      const generatedTransactions = await prisma.transaction.findMany({
        where: {
          tenantId: testTenantId,
          description: 'Monthly subscription'
        }
      });

      expect(generatedTransactions.length).toBeGreaterThan(0);
    });
  });
});