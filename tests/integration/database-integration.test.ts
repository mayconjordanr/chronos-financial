import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, DatabaseTestUtils, PerformanceTestUtils } from '../utils/test-utilities'

describe('Database Integration Tests with RLS', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('Complex Query Operations with RLS', () => {
    it('should handle complex joins with proper tenant isolation', async () => {
      const tenant1 = await testFactory.createTenantSetup({ slug: 'complex-tenant-1' })
      const tenant2 = await testFactory.createTenantSetup({ slug: 'complex-tenant-2' })

      // Create transactions for both tenants
      await testFactory.createTransaction({
        tenantId: tenant1.tenant.id,
        userId: tenant1.users.regular.id,
        accountId: tenant1.accounts.checking.id,
        categoryId: tenant1.categories.expense.id,
        amount: 100,
        description: 'Tenant 1 Transaction'
      })

      await testFactory.createTransaction({
        tenantId: tenant2.tenant.id,
        userId: tenant2.users.regular.id,
        accountId: tenant2.accounts.checking.id,
        categoryId: tenant2.categories.expense.id,
        amount: 200,
        description: 'Tenant 2 Transaction'
      })

      // Complex query with multiple joins - Tenant 1 context
      await setTenantContext(prisma, tenant1.tenant.id)

      const tenant1Results = await prisma.transaction.findMany({
        include: {
          user: {
            include: {
              tenant: true
            }
          },
          account: {
            include: {
              user: true
            }
          },
          category: true
        },
        orderBy: { createdAt: 'desc' }
      })

      expect(tenant1Results).toHaveLength(1)
      expect(tenant1Results[0].description).toBe('Tenant 1 Transaction')
      expect(tenant1Results[0].user.tenant.slug).toBe('complex-tenant-1')
      expect(tenant1Results[0].account.user.tenantId).toBe(tenant1.tenant.id)

      // Complex query with multiple joins - Tenant 2 context
      await setTenantContext(prisma, tenant2.tenant.id)

      const tenant2Results = await prisma.transaction.findMany({
        include: {
          user: {
            include: {
              tenant: true
            }
          },
          account: {
            include: {
              user: true
            }
          },
          category: true
        },
        orderBy: { createdAt: 'desc' }
      })

      expect(tenant2Results).toHaveLength(1)
      expect(tenant2Results[0].description).toBe('Tenant 2 Transaction')
      expect(tenant2Results[0].user.tenant.slug).toBe('complex-tenant-2')
      expect(tenant2Results[0].account.user.tenantId).toBe(tenant2.tenant.id)
    })

    it('should handle aggregations with grouping across tenant data', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create multiple categories and transactions
      const categories = await Promise.all([
        testFactory.createCategory({
          tenantId: setup.tenant.id,
          name: 'Food'
        }),
        testFactory.createCategory({
          tenantId: setup.tenant.id,
          name: 'Transportation'
        }),
        testFactory.createCategory({
          tenantId: setup.tenant.id,
          name: 'Entertainment'
        })
      ])

      // Create transactions for each category
      const transactionPromises = categories.flatMap(category =>
        Array(3).fill(0).map((_, i) =>
          testFactory.createTransaction({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: category.id,
            amount: (i + 1) * 50,
            type: 'EXPENSE'
          })
        )
      )

      await Promise.all(transactionPromises)

      // Complex aggregation query
      const categoryAggregations = await prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: {
          amount: true
        },
        _count: true,
        _avg: {
          amount: true
        },
        where: {
          type: 'EXPENSE'
        },
        orderBy: {
          _sum: {
            amount: 'desc'
          }
        }
      })

      expect(categoryAggregations).toHaveLength(3)

      // Each category should have 3 transactions
      categoryAggregations.forEach(agg => {
        expect(agg._count).toBe(3)
        expect(Number(agg._sum.amount)).toBe(300) // 50 + 100 + 150
        expect(Number(agg._avg.amount)).toBe(100) // Average of 50, 100, 150
      })

      // Verify isolation by checking we only see this tenant's data
      const totalTransactions = await prisma.transaction.count()
      expect(totalTransactions).toBe(9) // 3 categories × 3 transactions each
    })

    it('should handle complex filtering and search operations', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create transactions with various attributes for testing
      const testTransactions = await Promise.all([
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: setup.categories.expense.id,
          amount: 25.50,
          description: 'Coffee shop visit',
          tags: ['coffee', 'morning'],
          date: new Date('2024-01-15')
        }),
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: setup.categories.expense.id,
          amount: 150.00,
          description: 'Grocery shopping',
          tags: ['groceries', 'food'],
          date: new Date('2024-01-16')
        }),
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.savings.id,
          categoryId: setup.categories.income.id,
          amount: 2500.00,
          description: 'Salary payment',
          tags: ['salary', 'income'],
          date: new Date('2024-01-16')
        })
      ])

      // Complex search with multiple conditions
      const searchResults = await prisma.transaction.findMany({
        where: {
          AND: [
            {
              OR: [
                { description: { contains: 'coffee', mode: 'insensitive' } },
                { description: { contains: 'shop', mode: 'insensitive' } }
              ]
            },
            {
              amount: { gte: 20 }
            },
            {
              date: {
                gte: new Date('2024-01-01'),
                lte: new Date('2024-01-31')
              }
            }
          ]
        },
        include: {
          account: true,
          category: true
        },
        orderBy: [
          { date: 'desc' },
          { amount: 'desc' }
        ]
      })

      expect(searchResults).toHaveLength(2) // Coffee and grocery transactions
      expect(searchResults[0].description).toBe('Grocery shopping') // Higher amount, same date
      expect(searchResults[1].description).toBe('Coffee shop visit')

      // Test tag-based search
      const taggedTransactions = await prisma.transaction.findMany({
        where: {
          tags: {
            hasSome: ['coffee', 'food']
          }
        }
      })

      expect(taggedTransactions).toHaveLength(2)

      // Test amount range filtering
      const expensiveTransactions = await prisma.transaction.findMany({
        where: {
          amount: {
            gte: 100,
            lte: 200
          }
        }
      })

      expect(expensiveTransactions).toHaveLength(1)
      expect(expensiveTransactions[0].description).toBe('Grocery shopping')
    })
  })

  describe('Transaction Management and Consistency', () => {
    it('should handle complex multi-table transactions', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const initialCheckingBalance = Number(setup.accounts.checking.balance)
      const initialSavingsBalance = Number(setup.accounts.savings.balance)

      // Complex transaction: Create budget, transactions, and update account balances
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create a new category
        const category = await tx.category.create({
          data: {
            tenantId: setup.tenant.id,
            name: 'Investment',
            description: 'Investment transactions'
          }
        })

        // 2. Create a budget for this category
        const budget = await tx.budget.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            categoryId: category.id,
            name: 'Investment Budget',
            amount: 1000.00,
            period: 'MONTHLY',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })

        // 3. Create investment transaction (transfer from checking to savings)
        const transferAmount = 500.00

        const withdrawTransaction = await tx.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: category.id,
            amount: transferAmount,
            type: 'EXPENSE',
            description: 'Investment transfer',
            date: new Date(),
            reference: 'INV001'
          }
        })

        const depositTransaction = await tx.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.savings.id,
            categoryId: category.id,
            amount: transferAmount,
            type: 'INCOME',
            description: 'Investment deposit',
            date: new Date(),
            reference: 'INV001'
          }
        })

        // 4. Update account balances
        const updatedChecking = await tx.account.update({
          where: { id: setup.accounts.checking.id },
          data: { balance: initialCheckingBalance - transferAmount }
        })

        const updatedSavings = await tx.account.update({
          where: { id: setup.accounts.savings.id },
          data: { balance: initialSavingsBalance + transferAmount }
        })

        // 5. Update budget spent amount
        const updatedBudget = await tx.budget.update({
          where: { id: budget.id },
          data: { spent: transferAmount }
        })

        // 6. Create audit logs
        await tx.auditLog.createMany({
          data: [
            {
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              action: 'CREATE',
              resource: 'transaction',
              resourceId: withdrawTransaction.id,
              newValues: { type: 'withdrawal', amount: transferAmount }
            },
            {
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              action: 'CREATE',
              resource: 'transaction',
              resourceId: depositTransaction.id,
              newValues: { type: 'deposit', amount: transferAmount }
            }
          ]
        })

        return {
          category,
          budget: updatedBudget,
          transactions: [withdrawTransaction, depositTransaction],
          accounts: [updatedChecking, updatedSavings]
        }
      })

      // Verify all operations completed successfully
      expect(result.category.name).toBe('Investment')
      expect(Number(result.budget.spent)).toBe(500.00)
      expect(result.transactions).toHaveLength(2)
      expect(Number(result.accounts[0].balance)).toBe(initialCheckingBalance - 500.00)
      expect(Number(result.accounts[1].balance)).toBe(initialSavingsBalance + 500.00)

      // Verify audit logs were created
      const auditLogs = await prisma.auditLog.findMany({
        where: { resource: 'transaction' }
      })
      expect(auditLogs).toHaveLength(2)
    })

    it('should maintain consistency during concurrent operations', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const initialBalance = Number(setup.accounts.checking.balance)

      // Simulate concurrent transactions
      const concurrentOperations = Array(10).fill(0).map(async (_, index) => {
        return prisma.$transaction(async (tx) => {
          // Read current balance
          const account = await tx.account.findUnique({
            where: { id: setup.accounts.checking.id }
          })

          // Create transaction
          const transaction = await tx.transaction.create({
            data: {
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              accountId: setup.accounts.checking.id,
              amount: 10.00,
              type: 'EXPENSE',
              description: `Concurrent transaction ${index}`,
              date: new Date()
            }
          })

          // Update balance
          const updatedAccount = await tx.account.update({
            where: { id: setup.accounts.checking.id },
            data: { balance: Number(account!.balance) - 10.00 }
          })

          return { transaction, account: updatedAccount }
        })
      })

      const results = await Promise.all(concurrentOperations)

      // Verify all operations completed
      expect(results).toHaveLength(10)

      // Verify final balance is correct
      const finalAccount = await prisma.account.findUnique({
        where: { id: setup.accounts.checking.id }
      })

      expect(Number(finalAccount!.balance)).toBe(initialBalance - 100.00) // 10 transactions × $10 each

      // Verify all transactions were created
      const allTransactions = await prisma.transaction.findMany({
        where: { description: { startsWith: 'Concurrent transaction' } }
      })

      expect(allTransactions).toHaveLength(10)
    })

    it('should handle deadlock scenarios gracefully', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create another account for cross-account operations
      const account2 = await testFactory.createAccount({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        name: 'Second Account',
        type: 'SAVINGS',
        balance: 1000.00
      })

      // Simulate potential deadlock scenario with cross-account transfers
      const operation1 = prisma.$transaction(async (tx) => {
        // Transfer from account1 to account2
        await tx.account.update({
          where: { id: setup.accounts.checking.id },
          data: { balance: { decrement: 50 } }
        })

        // Small delay to increase chance of deadlock
        await new Promise(resolve => setTimeout(resolve, 10))

        await tx.account.update({
          where: { id: account2.id },
          data: { balance: { increment: 50 } }
        })

        return 'operation1'
      })

      const operation2 = prisma.$transaction(async (tx) => {
        // Transfer from account2 to account1
        await tx.account.update({
          where: { id: account2.id },
          data: { balance: { decrement: 30 } }
        })

        // Small delay to increase chance of deadlock
        await new Promise(resolve => setTimeout(resolve, 10))

        await tx.account.update({
          where: { id: setup.accounts.checking.id },
          data: { balance: { increment: 30 } }
        })

        return 'operation2'
      })

      // Both operations should complete (PostgreSQL handles deadlocks)
      const results = await Promise.all([operation1, operation2])
      expect(results).toEqual(['operation1', 'operation2'])

      // Verify final balances are consistent
      const finalAccounts = await prisma.account.findMany({
        where: { id: { in: [setup.accounts.checking.id, account2.id] } }
      })

      const checkingAccount = finalAccounts.find(a => a.id === setup.accounts.checking.id)
      const savingsAccount = finalAccounts.find(a => a.id === account2.id)

      // Net effect: checking -50 +30 = -20, savings +50 -30 = +20
      expect(Number(checkingAccount!.balance)).toBe(1000.00 - 20.00)
      expect(Number(savingsAccount!.balance)).toBe(1000.00 + 20.00)
    })
  })

  describe('Performance and Optimization', () => {
    it('should perform efficiently with large datasets', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create a large number of transactions
      const transactionData = Array(1000).fill(0).map((_, i) => ({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: i % 2 === 0 ? setup.accounts.checking.id : setup.accounts.savings.id,
        categoryId: i % 2 === 0 ? setup.categories.expense.id : setup.categories.income.id,
        amount: Math.random() * 1000,
        type: i % 2 === 0 ? 'EXPENSE' : 'INCOME' as const,
        description: `Bulk transaction ${i}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      }))

      // Bulk insert transactions
      const { duration: insertTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        await prisma.transaction.createMany({
          data: transactionData
        })
      })

      expect(insertTime).toBeLessThan(5000) // Should complete in less than 5 seconds

      // Test query performance on large dataset
      const { duration: queryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          where: {
            amount: { gte: 500 },
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          },
          include: {
            account: true,
            category: true
          },
          orderBy: { date: 'desc' },
          take: 50
        })
      })

      expect(queryTime).toBeLessThan(1000) // Should complete in less than 1 second

      // Test aggregation performance
      const { duration: aggregateTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.groupBy({
          by: ['type', 'accountId'],
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true }
        })
      })

      expect(aggregateTime).toBeLessThan(1000) // Should complete in less than 1 second
    })

    it('should optimize queries with proper indexing', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create transactions with various patterns for index testing
      await testFactory.createBulkTransactions(
        setup.tenant.id,
        setup.users.regular.id,
        setup.accounts.checking.id,
        setup.categories.expense.id,
        500
      )

      // Test tenant_id index performance
      const { duration: tenantQueryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          where: { tenantId: setup.tenant.id },
          take: 100
        })
      })

      expect(tenantQueryTime).toBeLessThan(500)

      // Test composite index performance (tenant_id + date)
      const { duration: dateQueryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          where: {
            tenantId: setup.tenant.id,
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          orderBy: { date: 'desc' },
          take: 50
        })
      })

      expect(dateQueryTime).toBeLessThan(500)

      // Test user index performance
      const { duration: userQueryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          where: { userId: setup.users.regular.id },
          include: { account: true },
          take: 100
        })
      })

      expect(userQueryTime).toBeLessThan(500)
    })

    it('should handle connection pooling efficiently', async () => {
      const setup = await testFactory.createTenantSetup()

      // Test multiple concurrent connections
      const connectionTests = Array(20).fill(0).map(async (_, index) => {
        // Create a new Prisma client for each "connection"
        const client = new PrismaClient()

        try {
          await client.$connect()
          await client.$executeRaw`SELECT set_tenant_context(${setup.tenant.id})`

          // Perform a simple query
          const result = await client.transaction.count()

          await client.$disconnect()
          return { index, success: true, count: result }
        } catch (error) {
          await client.$disconnect()
          return { index, success: false, error: error.message }
        }
      })

      const results = await Promise.all(connectionTests)

      // All connections should succeed
      const successCount = results.filter(r => r.success).length
      expect(successCount).toBe(20)

      // All should return the same count (tenant isolation working)
      const counts = results.filter(r => r.success).map(r => r.count)
      const uniqueCounts = [...new Set(counts)]
      expect(uniqueCounts).toHaveLength(1)
    })
  })

  describe('Data Integrity and Constraints', () => {
    it('should maintain referential integrity under high load', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create multiple related entities concurrently
      const operations = await Promise.all([
        // Create categories
        Promise.all(Array(10).fill(0).map((_, i) =>
          testFactory.createCategory({
            tenantId: setup.tenant.id,
            name: `Category ${i}`
          })
        )),
        // Create accounts
        Promise.all(Array(5).fill(0).map((_, i) =>
          testFactory.createAccount({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            name: `Account ${i}`,
            type: 'CHECKING'
          })
        ))
      ])

      const [categories, accounts] = operations

      // Create transactions referencing these entities
      const transactionPromises = Array(100).fill(0).map((_, i) =>
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: accounts[i % accounts.length].id,
          categoryId: categories[i % categories.length].id,
          amount: Math.random() * 100
        })
      )

      const transactions = await Promise.all(transactionPromises)

      // Verify all relationships are intact
      const transactionsWithRelations = await prisma.transaction.findMany({
        include: {
          account: true,
          category: true,
          user: true
        }
      })

      expect(transactionsWithRelations).toHaveLength(100)
      transactionsWithRelations.forEach(transaction => {
        expect(transaction.account).toBeTruthy()
        expect(transaction.category).toBeTruthy()
        expect(transaction.user).toBeTruthy()
        expect(transaction.tenantId).toBe(setup.tenant.id)
        expect(transaction.account.tenantId).toBe(setup.tenant.id)
        expect(transaction.category!.tenantId).toBe(setup.tenant.id)
        expect(transaction.user.tenantId).toBe(setup.tenant.id)
      })
    })

    it('should enforce data validation at database level', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Test various constraint violations
      const validationTests = [
        // Invalid email format (handled by application, but test constraint)
        {
          test: () => prisma.user.create({
            data: {
              tenantId: setup.tenant.id,
              email: 'invalid-email',
              firstName: 'Test',
              lastName: 'User',
              password: 'password'
            }
          }),
          shouldFail: false // Email validation is typically at application level
        },
        // Negative balance (should be allowed for credit accounts)
        {
          test: () => prisma.account.create({
            data: {
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              name: 'Credit Account',
              type: 'CREDIT_CARD',
              balance: -1000.00
            }
          }),
          shouldFail: false // Negative balances are valid for credit accounts
        },
        // Invalid transaction type
        {
          test: () => prisma.$executeRaw`
            INSERT INTO transactions (id, tenant_id, user_id, account_id, amount, type, description, date)
            VALUES (gen_random_uuid(), ${setup.tenant.id}, ${setup.users.regular.id}, ${setup.accounts.checking.id}, 100, 'INVALID_TYPE', 'Test', NOW())
          `,
          shouldFail: true // Should fail due to enum constraint
        },
        // Null required field
        {
          test: () => prisma.transaction.create({
            data: {
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              accountId: setup.accounts.checking.id,
              amount: 100,
              type: 'EXPENSE',
              description: '', // Empty description should be allowed
              date: new Date()
            }
          }),
          shouldFail: false // Empty string is different from null
        }
      ]

      for (const [index, { test, shouldFail }] of validationTests.entries()) {
        if (shouldFail) {
          await expect(test()).rejects.toThrow()
        } else {
          await expect(test()).resolves.toBeTruthy()
        }
      }
    })

    it('should handle cascade deletions properly', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create additional data that should be cascaded
      const transaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        categoryId: setup.categories.expense.id
      })

      const budget = await testFactory.createBudget({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id
      })

      const session = await prisma.session.create({
        data: {
          userId: setup.users.regular.id,
          token: 'test-token',
          expiresAt: new Date(Date.now() + 3600000)
        }
      })

      // Delete the user - should cascade to related entities
      await prisma.user.delete({
        where: { id: setup.users.regular.id }
      })

      // Verify cascaded deletions
      const deletedTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id }
      })
      expect(deletedTransaction).toBeNull()

      const deletedBudget = await prisma.budget.findUnique({
        where: { id: budget.id }
      })
      expect(deletedBudget).toBeNull()

      const deletedSession = await prisma.session.findUnique({
        where: { id: session.id }
      })
      expect(deletedSession).toBeNull()

      const deletedAccounts = await prisma.account.findMany({
        where: { userId: setup.users.regular.id }
      })
      expect(deletedAccounts).toHaveLength(0)
    })
  })
})