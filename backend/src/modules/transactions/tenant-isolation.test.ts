import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient, TransactionType } from '@prisma/client';
import { TransactionService } from './transactions.service';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';

describe('Transaction Tenant Isolation Tests', () => {
  let transactionService: TransactionService;
  let prisma: PrismaClient;

  // Tenant 1 resources
  let tenant1Id: string;
  let user1Id: string;
  let account1Id: string;
  let category1Id: string;

  // Tenant 2 resources
  let tenant2Id: string;
  let user2Id: string;
  let account2Id: string;
  let category2Id: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    transactionService = new TransactionService(prisma);

    // Initialize tenant 1
    tenant1Id = uuidv4();
    user1Id = uuidv4();
    account1Id = uuidv4();
    category1Id = uuidv4();

    // Initialize tenant 2
    tenant2Id = uuidv4();
    user2Id = uuidv4();
    account2Id = uuidv4();
    category2Id = uuidv4();

    // Create two separate tenants
    await prisma.tenant.createMany({
      data: [
        {
          id: tenant1Id,
          name: 'Tenant One',
          slug: `tenant1-${Date.now()}`,
          status: 'ACTIVE'
        },
        {
          id: tenant2Id,
          name: 'Tenant Two',
          slug: `tenant2-${Date.now()}`,
          status: 'ACTIVE'
        }
      ]
    });

    // Create users in both tenants
    await prisma.user.createMany({
      data: [
        {
          id: user1Id,
          tenantId: tenant1Id,
          email: 'user1@tenant1.com',
          firstName: 'User',
          lastName: 'One',
          password: 'hashedpassword1',
          isActive: true
        },
        {
          id: user2Id,
          tenantId: tenant2Id,
          email: 'user2@tenant2.com',
          firstName: 'User',
          lastName: 'Two',
          password: 'hashedpassword2',
          isActive: true
        }
      ]
    });

    // Create accounts in both tenants
    await prisma.account.createMany({
      data: [
        {
          id: account1Id,
          tenantId: tenant1Id,
          userId: user1Id,
          name: 'Tenant 1 Account',
          type: 'CHECKING',
          balance: new Decimal('1000.00')
        },
        {
          id: account2Id,
          tenantId: tenant2Id,
          userId: user2Id,
          name: 'Tenant 2 Account',
          type: 'CHECKING',
          balance: new Decimal('1000.00')
        }
      ]
    });

    // Create categories in both tenants
    await prisma.category.createMany({
      data: [
        {
          id: category1Id,
          tenantId: tenant1Id,
          name: 'Tenant 1 Category',
          description: 'Category for tenant 1',
          color: '#FF5733'
        },
        {
          id: category2Id,
          tenantId: tenant2Id,
          name: 'Tenant 2 Category',
          description: 'Category for tenant 2',
          color: '#33FF57'
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up test data in correct order
    await prisma.recurringTransaction.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.transaction.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.account.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.category.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
    await prisma.$disconnect();
  });

  describe('Transaction Creation Isolation', () => {
    it('should prevent creating transaction with account from different tenant', async () => {
      const transactionData = {
        accountId: account2Id, // Account from tenant 2
        categoryId: category1Id,
        amount: new Decimal('100.00'),
        type: TransactionType.EXPENSE,
        description: 'Cross-tenant attack',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        user1Id,
        tenant1Id // User from tenant 1 trying to use account from tenant 2
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');

      // Verify no transaction was created
      const transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant1Id }
      });
      expect(transactions).toHaveLength(0);

      // Verify account balance wasn't affected
      const account = await prisma.account.findFirst({
        where: { id: account2Id, tenantId: tenant2Id }
      });
      expect(account?.balance).toEqual(new Decimal('1000.00'));
    });

    it('should prevent creating transaction with category from different tenant', async () => {
      const transactionData = {
        accountId: account1Id,
        categoryId: category2Id, // Category from tenant 2
        amount: new Decimal('100.00'),
        type: TransactionType.EXPENSE,
        description: 'Cross-tenant category attack',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        user1Id,
        tenant1Id // User from tenant 1 trying to use category from tenant 2
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');

      // Verify no transaction was created
      const transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant1Id }
      });
      expect(transactions).toHaveLength(0);
    });

    it('should prevent transfer to account from different tenant', async () => {
      const transactionData = {
        accountId: account1Id,
        toAccountId: account2Id, // Destination account from tenant 2
        amount: new Decimal('100.00'),
        type: TransactionType.TRANSFER,
        description: 'Cross-tenant transfer attack',
        date: new Date()
      };

      const result = await transactionService.createTransaction(
        transactionData,
        user1Id,
        tenant1Id
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Destination account not found or access denied');

      // Verify no transaction was created
      const transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant1Id }
      });
      expect(transactions).toHaveLength(0);

      // Verify balances weren't affected
      const account1 = await prisma.account.findFirst({ where: { id: account1Id } });
      const account2 = await prisma.account.findFirst({ where: { id: account2Id } });
      expect(account1?.balance).toEqual(new Decimal('1000.00'));
      expect(account2?.balance).toEqual(new Decimal('1000.00'));
    });
  });

  describe('Transaction Retrieval Isolation', () => {
    beforeEach(async () => {
      // Create transactions in both tenants
      await prisma.transaction.createMany({
        data: [
          {
            id: uuidv4(),
            tenantId: tenant1Id,
            userId: user1Id,
            accountId: account1Id,
            categoryId: category1Id,
            amount: new Decimal('100.00'),
            type: TransactionType.EXPENSE,
            description: 'Tenant 1 Transaction 1'
          },
          {
            id: uuidv4(),
            tenantId: tenant1Id,
            userId: user1Id,
            accountId: account1Id,
            categoryId: category1Id,
            amount: new Decimal('200.00'),
            type: TransactionType.INCOME,
            description: 'Tenant 1 Transaction 2'
          },
          {
            id: uuidv4(),
            tenantId: tenant2Id,
            userId: user2Id,
            accountId: account2Id,
            categoryId: category2Id,
            amount: new Decimal('150.00'),
            type: TransactionType.EXPENSE,
            description: 'Tenant 2 Transaction 1'
          },
          {
            id: uuidv4(),
            tenantId: tenant2Id,
            userId: user2Id,
            accountId: account2Id,
            categoryId: category2Id,
            amount: new Decimal('300.00'),
            type: TransactionType.INCOME,
            description: 'Tenant 2 Transaction 2'
          }
        ]
      });
    });

    it('should only return transactions for correct tenant', async () => {
      const result1 = await transactionService.getTransactions(user1Id, tenant1Id);
      const result2 = await transactionService.getTransactions(user2Id, tenant2Id);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      expect(result1.transactions).toHaveLength(2);
      expect(result2.transactions).toHaveLength(2);

      // Verify tenant isolation
      expect(result1.transactions?.every(t => t.tenantId === tenant1Id)).toBe(true);
      expect(result2.transactions?.every(t => t.tenantId === tenant2Id)).toBe(true);

      // Verify specific transaction content
      const tenant1Descriptions = result1.transactions?.map(t => t.description).sort();
      const tenant2Descriptions = result2.transactions?.map(t => t.description).sort();

      expect(tenant1Descriptions).toEqual(['Tenant 1 Transaction 1', 'Tenant 1 Transaction 2']);
      expect(tenant2Descriptions).toEqual(['Tenant 2 Transaction 1', 'Tenant 2 Transaction 2']);
    });

    it('should not return transactions when using wrong tenant context', async () => {
      // Try to get tenant 1 transactions using tenant 2 context
      const result = await transactionService.getTransactions(user1Id, tenant2Id);

      expect(result.success).toBe(true);
      expect(result.transactions).toHaveLength(0); // Should return empty array
    });

    it('should isolate transaction retrieval by ID', async () => {
      // Create a transaction in tenant 1
      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: tenant1Id,
          userId: user1Id,
          accountId: account1Id,
          categoryId: category1Id,
          amount: new Decimal('500.00'),
          type: TransactionType.EXPENSE,
          description: 'Isolated transaction'
        }
      });

      // Should retrieve successfully with correct tenant
      const result1 = await transactionService.getTransaction(
        transaction.id,
        user1Id,
        tenant1Id
      );
      expect(result1.success).toBe(true);
      expect(result1.transaction?.id).toBe(transaction.id);

      // Should fail with wrong tenant
      const result2 = await transactionService.getTransaction(
        transaction.id,
        user2Id,
        tenant2Id
      );
      expect(result2.success).toBe(false);
      expect(result2.message).toBe('Transaction not found or access denied');
    });
  });

  describe('Transaction Update Isolation', () => {
    let tenant1TransactionId: string;
    let tenant2TransactionId: string;

    beforeEach(async () => {
      // Create transactions in both tenants
      const tenant1Transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: tenant1Id,
          userId: user1Id,
          accountId: account1Id,
          categoryId: category1Id,
          amount: new Decimal('100.00'),
          type: TransactionType.EXPENSE,
          description: 'Tenant 1 Original'
        }
      });

      const tenant2Transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: tenant2Id,
          userId: user2Id,
          accountId: account2Id,
          categoryId: category2Id,
          amount: new Decimal('200.00'),
          type: TransactionType.EXPENSE,
          description: 'Tenant 2 Original'
        }
      });

      tenant1TransactionId = tenant1Transaction.id;
      tenant2TransactionId = tenant2Transaction.id;
    });

    it('should not update transaction from different tenant', async () => {
      const updateData = {
        description: 'Hacked description',
        amount: new Decimal('999.99')
      };

      // Try to update tenant 2 transaction from tenant 1 context
      const result = await transactionService.updateTransaction(
        tenant2TransactionId,
        updateData,
        user1Id,
        tenant1Id
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Transaction not found or access denied');

      // Verify original transaction was not modified
      const originalTransaction = await prisma.transaction.findFirst({
        where: { id: tenant2TransactionId, tenantId: tenant2Id }
      });
      expect(originalTransaction?.description).toBe('Tenant 2 Original');
      expect(originalTransaction?.amount).toEqual(new Decimal('200.00'));
    });

    it('should successfully update own transaction', async () => {
      const updateData = {
        description: 'Updated description',
        amount: new Decimal('150.00')
      };

      const result = await transactionService.updateTransaction(
        tenant1TransactionId,
        updateData,
        user1Id,
        tenant1Id
      );

      expect(result.success).toBe(true);
      expect(result.transaction?.description).toBe('Updated description');
      expect(result.transaction?.amount).toEqual(new Decimal('150.00'));
    });

    it('should prevent updating transaction with category from different tenant', async () => {
      const updateData = {
        categoryId: category2Id // Category from tenant 2
      };

      const result = await transactionService.updateTransaction(
        tenant1TransactionId,
        updateData,
        user1Id,
        tenant1Id
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Category not found or access denied');

      // Verify transaction wasn't updated
      const transaction = await prisma.transaction.findFirst({
        where: { id: tenant1TransactionId, tenantId: tenant1Id }
      });
      expect(transaction?.categoryId).toBe(category1Id); // Should remain unchanged
    });
  });

  describe('Transaction Deletion Isolation', () => {
    let tenant1TransactionId: string;
    let tenant2TransactionId: string;

    beforeEach(async () => {
      const tenant1Transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: tenant1Id,
          userId: user1Id,
          accountId: account1Id,
          categoryId: category1Id,
          amount: new Decimal('100.00'),
          type: TransactionType.EXPENSE,
          description: 'To be deleted (tenant 1)'
        }
      });

      const tenant2Transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          tenantId: tenant2Id,
          userId: user2Id,
          accountId: account2Id,
          categoryId: category2Id,
          amount: new Decimal('200.00'),
          type: TransactionType.EXPENSE,
          description: 'Should not be deleted (tenant 2)'
        }
      });

      tenant1TransactionId = tenant1Transaction.id;
      tenant2TransactionId = tenant2Transaction.id;
    });

    it('should not delete transaction from different tenant', async () => {
      const result = await transactionService.deleteTransaction(
        tenant2TransactionId,
        user1Id,
        tenant1Id
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Transaction not found or access denied');

      // Verify transaction still exists
      const transaction = await prisma.transaction.findFirst({
        where: { id: tenant2TransactionId, tenantId: tenant2Id }
      });
      expect(transaction).toBeTruthy();
      expect(transaction?.description).toBe('Should not be deleted (tenant 2)');
    });

    it('should successfully delete own transaction', async () => {
      const result = await transactionService.deleteTransaction(
        tenant1TransactionId,
        user1Id,
        tenant1Id
      );

      expect(result.success).toBe(true);

      // Verify transaction is deleted
      const transaction = await prisma.transaction.findFirst({
        where: { id: tenant1TransactionId, tenantId: tenant1Id }
      });
      expect(transaction).toBeNull();
    });
  });

  describe('Recurring Transaction Isolation', () => {
    it('should prevent creating recurring transaction with cross-tenant resources', async () => {
      const recurringData = {
        accountId: account2Id, // Account from tenant 2
        categoryId: category1Id, // Category from tenant 1
        amount: new Decimal('500.00'),
        type: TransactionType.INCOME,
        description: 'Cross-tenant recurring',
        frequency: 'MONTHLY' as const,
        startDate: new Date()
      };

      const result = await transactionService.createRecurringTransaction(
        recurringData,
        user1Id,
        tenant1Id
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');
    });

    it('should isolate recurring transaction generation by tenant', async () => {
      // Create recurring transactions in both tenants
      const recurring1Data = {
        accountId: account1Id,
        categoryId: category1Id,
        amount: new Decimal('100.00'),
        type: TransactionType.INCOME,
        description: 'Tenant 1 Recurring',
        frequency: 'MONTHLY' as const,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      };

      const recurring2Data = {
        accountId: account2Id,
        categoryId: category2Id,
        amount: new Decimal('200.00'),
        type: TransactionType.INCOME,
        description: 'Tenant 2 Recurring',
        frequency: 'MONTHLY' as const,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      };

      await transactionService.createRecurringTransaction(
        recurring1Data,
        user1Id,
        tenant1Id
      );
      await transactionService.createRecurringTransaction(
        recurring2Data,
        user2Id,
        tenant2Id
      );

      // Generate recurring transactions for tenant 1 only
      const result1 = await transactionService.generateRecurringTransactions(
        user1Id,
        tenant1Id
      );

      expect(result1.success).toBe(true);
      expect(result1.generated).toBe(1);

      // Verify only tenant 1 transactions were generated
      const tenant1Transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant1Id }
      });
      const tenant2Transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant2Id }
      });

      expect(tenant1Transactions).toHaveLength(1);
      expect(tenant2Transactions).toHaveLength(0);

      expect(tenant1Transactions[0].description).toBe('Tenant 1 Recurring');
    });
  });

  describe('Cross-Tenant Attack Prevention', () => {
    it('should prevent all forms of cross-tenant attacks', async () => {
      const maliciousTenantId = uuidv4();

      // All transaction operations should fail with non-existent tenant
      const createResult = await transactionService.createTransaction(
        {
          accountId: account1Id,
          categoryId: category1Id,
          amount: new Decimal('100.00'),
          type: TransactionType.EXPENSE,
          description: 'Attack attempt'
        },
        user1Id,
        maliciousTenantId
      );
      expect(createResult.success).toBe(false);

      const getResult = await transactionService.getTransactions(
        user1Id,
        maliciousTenantId
      );
      expect(getResult.success).toBe(true);
      expect(getResult.transactions).toHaveLength(0);

      const updateResult = await transactionService.updateTransaction(
        uuidv4(),
        { description: 'Attack' },
        user1Id,
        maliciousTenantId
      );
      expect(updateResult.success).toBe(false);

      const deleteResult = await transactionService.deleteTransaction(
        uuidv4(),
        user1Id,
        maliciousTenantId
      );
      expect(deleteResult.success).toBe(false);

      const recurringResult = await transactionService.createRecurringTransaction(
        {
          accountId: account1Id,
          amount: new Decimal('100.00'),
          type: TransactionType.INCOME,
          description: 'Attack recurring',
          frequency: 'MONTHLY',
          startDate: new Date()
        },
        user1Id,
        maliciousTenantId
      );
      expect(recurringResult.success).toBe(false);
    });

    it('should maintain tenant isolation under concurrent operations', async () => {
      const operations = [];

      // Create multiple concurrent operations from both tenants
      for (let i = 0; i < 10; i++) {
        operations.push(
          transactionService.createTransaction(
            {
              accountId: account1Id,
              categoryId: category1Id,
              amount: new Decimal('10.00'),
              type: TransactionType.EXPENSE,
              description: `Tenant 1 - ${i}`
            },
            user1Id,
            tenant1Id
          )
        );

        operations.push(
          transactionService.createTransaction(
            {
              accountId: account2Id,
              categoryId: category2Id,
              amount: new Decimal('20.00'),
              type: TransactionType.EXPENSE,
              description: `Tenant 2 - ${i}`
            },
            user2Id,
            tenant2Id
          )
        );
      }

      const results = await Promise.all(operations);

      // All operations should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Verify tenant isolation maintained
      const tenant1Transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant1Id }
      });
      const tenant2Transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant2Id }
      });

      expect(tenant1Transactions).toHaveLength(10);
      expect(tenant2Transactions).toHaveLength(10);

      expect(tenant1Transactions.every(t => t.tenantId === tenant1Id)).toBe(true);
      expect(tenant2Transactions.every(t => t.tenantId === tenant2Id)).toBe(true);

      expect(tenant1Transactions.every(t => t.userId === user1Id)).toBe(true);
      expect(tenant2Transactions.every(t => t.userId === user2Id)).toBe(true);
    });
  });
});