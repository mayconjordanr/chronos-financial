import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, SecurityTestUtils, PerformanceTestUtils } from '../utils/test-utilities'

describe('Tenant Data Leakage Prevention Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('Direct Data Access Leakage Prevention', () => {
    it('should prevent direct access to other tenant data through ID manipulation', async () => {
      // Create two tenants with comprehensive data
      const tenant1Setup = await testFactory.createTenantSetup({
        name: 'Secure Tenant 1',
        slug: 'secure-tenant-1'
      })

      const tenant2Setup = await testFactory.createTenantSetup({
        name: 'Secure Tenant 2',
        slug: 'secure-tenant-2'
      })

      // Create additional sensitive data for both tenants
      await setTenantContext(prisma, tenant1Setup.tenant.id)

      const t1Transaction = await testFactory.createTransaction({
        tenantId: tenant1Setup.tenant.id,
        userId: tenant1Setup.users.regular.id,
        accountId: tenant1Setup.accounts.checking.id,
        amount: 10000.00,
        description: 'T1 Confidential Transaction',
        notes: 'Sensitive financial information for tenant 1'
      })

      const t1Budget = await testFactory.createBudget({
        tenantId: tenant1Setup.tenant.id,
        userId: tenant1Setup.users.regular.id,
        name: 'T1 Secret Budget',
        amount: 50000.00
      })

      await setTenantContext(prisma, tenant2Setup.tenant.id)

      const t2Transaction = await testFactory.createTransaction({
        tenantId: tenant2Setup.tenant.id,
        userId: tenant2Setup.users.regular.id,
        accountId: tenant2Setup.accounts.checking.id,
        amount: 20000.00,
        description: 'T2 Confidential Transaction',
        notes: 'Sensitive financial information for tenant 2'
      })

      const t2Budget = await testFactory.createBudget({
        tenantId: tenant2Setup.tenant.id,
        userId: tenant2Setup.users.regular.id,
        name: 'T2 Secret Budget',
        amount: 75000.00
      })

      // Test 1: Set tenant 1 context and attempt to access tenant 2 data
      await setTenantContext(prisma, tenant1Setup.tenant.id)

      // Direct ID access attempts
      const crossTenantUser = await prisma.user.findUnique({
        where: { id: tenant2Setup.users.regular.id }
      })
      expect(crossTenantUser).toBeNull()

      const crossTenantAccount = await prisma.account.findUnique({
        where: { id: tenant2Setup.accounts.checking.id }
      })
      expect(crossTenantAccount).toBeNull()

      const crossTenantTransaction = await prisma.transaction.findUnique({
        where: { id: t2Transaction.id }
      })
      expect(crossTenantTransaction).toBeNull()

      const crossTenantBudget = await prisma.budget.findUnique({
        where: { id: t2Budget.id }
      })
      expect(crossTenantBudget).toBeNull()

      // Verify legitimate data is accessible
      const ownTransaction = await prisma.transaction.findUnique({
        where: { id: t1Transaction.id }
      })
      expect(ownTransaction).toBeTruthy()
      expect(ownTransaction!.description).toBe('T1 Confidential Transaction')

      // Test 2: Reverse direction - tenant 2 accessing tenant 1 data
      await setTenantContext(prisma, tenant2Setup.tenant.id)

      const reverseCrossTenantUser = await prisma.user.findUnique({
        where: { id: tenant1Setup.users.regular.id }
      })
      expect(reverseCrossTenantUser).toBeNull()

      const reverseCrossTenantTransaction = await prisma.transaction.findUnique({
        where: { id: t1Transaction.id }
      })
      expect(reverseCrossTenantTransaction).toBeNull()

      // Verify own data is accessible
      const ownTransaction2 = await prisma.transaction.findUnique({
        where: { id: t2Transaction.id }
      })
      expect(ownTransaction2).toBeTruthy()
      expect(ownTransaction2!.description).toBe('T2 Confidential Transaction')
    })

    it('should prevent data leakage through batch operations', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'batch-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'batch-tenant-2' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id
      })

      // Create transactions for both tenants
      const t1Transactions = await Promise.all(
        Array(10).fill(0).map((_, i) =>
          testFactory.createTransaction({
            tenantId: tenant1.id,
            userId: user1.id,
            accountId: account1.id,
            amount: (i + 1) * 100,
            description: `T1 Batch Transaction ${i + 1}`
          })
        )
      )

      const t2Transactions = await Promise.all(
        Array(10).fill(0).map((_, i) =>
          testFactory.createTransaction({
            tenantId: tenant2.id,
            userId: user2.id,
            accountId: account2.id,
            amount: (i + 1) * 200,
            description: `T2 Batch Transaction ${i + 1}`
          })
        )
      )

      // Set tenant 1 context and attempt batch operations with mixed IDs
      await setTenantContext(prisma, tenant1.id)

      // Attempt to query transactions from both tenants
      const mixedIdQuery = await prisma.transaction.findMany({
        where: {
          id: { in: [...t1Transactions.map(t => t.id), ...t2Transactions.map(t => t.id)] }
        }
      })

      // Should only return tenant 1 transactions
      expect(mixedIdQuery).toHaveLength(10)
      expect(mixedIdQuery.every(t => t.tenantId === tenant1.id)).toBe(true)
      expect(mixedIdQuery.every(t => t.description.startsWith('T1'))).toBe(true)

      // Attempt batch update with mixed IDs
      const updateResult = await prisma.transaction.updateMany({
        where: {
          id: { in: [...t1Transactions.slice(0, 5).map(t => t.id), ...t2Transactions.slice(0, 5).map(t => t.id)] }
        },
        data: {
          notes: 'Batch updated from tenant 1'
        }
      })

      // Should only update tenant 1 transactions
      expect(updateResult.count).toBe(5)

      // Verify tenant 2 transactions were not affected
      await setTenantContext(prisma, tenant2.id)

      const unaffectedTransactions = await prisma.transaction.findMany({
        where: {
          id: { in: t2Transactions.slice(0, 5).map(t => t.id) }
        }
      })

      expect(unaffectedTransactions).toHaveLength(5)
      expect(unaffectedTransactions.every(t => !t.notes || t.notes !== 'Batch updated from tenant 1')).toBe(true)

      // Attempt batch delete with mixed IDs from tenant 2
      const deleteResult = await prisma.transaction.deleteMany({
        where: {
          id: { in: [...t1Transactions.slice(5).map(t => t.id), ...t2Transactions.slice(5).map(t => t.id)] }
        }
      })

      // Should only delete tenant 2 transactions
      expect(deleteResult.count).toBe(5)

      // Verify tenant 1 transactions still exist
      await setTenantContext(prisma, tenant1.id)

      const remainingT1Transactions = await prisma.transaction.findMany({
        where: {
          id: { in: t1Transactions.slice(5).map(t => t.id) }
        }
      })

      expect(remainingT1Transactions).toHaveLength(5)
    })

    it('should prevent leakage through relationship traversal', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'rel-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'rel-tenant-2' })

      // Create complex related data
      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'user1@rel-test.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'user2@rel-test.com'
      })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id,
        name: 'T1 Secret Account'
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id,
        name: 'T2 Secret Account'
      })

      const category1 = await testFactory.createCategory({
        tenantId: tenant1.id,
        name: 'T1 Secret Category'
      })

      const category2 = await testFactory.createCategory({
        tenantId: tenant2.id,
        name: 'T2 Secret Category'
      })

      // Create transactions with relationships
      const transaction1 = await testFactory.createTransaction({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        categoryId: category1.id,
        description: 'T1 Secret Transaction'
      })

      const transaction2 = await testFactory.createTransaction({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        categoryId: category2.id,
        description: 'T2 Secret Transaction'
      })

      // Test relationship traversal from tenant 1 context
      await setTenantContext(prisma, tenant1.id)

      // Deep relationship query should not leak tenant 2 data
      const deepRelationshipQuery = await prisma.user.findMany({
        include: {
          tenant: true,
          accounts: {
            include: {
              transactions: {
                include: {
                  category: true,
                  user: {
                    include: {
                      accounts: {
                        include: {
                          transactions: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          transactions: {
            include: {
              account: {
                include: {
                  user: true
                }
              },
              category: true
            }
          }
        }
      })

      // Verify all returned data belongs to tenant 1
      expect(deepRelationshipQuery).toHaveLength(1)
      const userData = deepRelationshipQuery[0]

      expect(userData.tenantId).toBe(tenant1.id)
      expect(userData.tenant.id).toBe(tenant1.id)

      userData.accounts.forEach(account => {
        expect(account.tenantId).toBe(tenant1.id)
        account.transactions.forEach(transaction => {
          expect(transaction.tenantId).toBe(tenant1.id)
          expect(transaction.user.tenantId).toBe(tenant1.id)
          if (transaction.category) {
            expect(transaction.category.tenantId).toBe(tenant1.id)
          }
          transaction.user.accounts.forEach(nestedAccount => {
            expect(nestedAccount.tenantId).toBe(tenant1.id)
            nestedAccount.transactions.forEach(nestedTransaction => {
              expect(nestedTransaction.tenantId).toBe(tenant1.id)
            })
          })
        })
      })

      userData.transactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(tenant1.id)
        expect(transaction.account.tenantId).toBe(tenant1.id)
        expect(transaction.account.user.tenantId).toBe(tenant1.id)
        if (transaction.category) {
          expect(transaction.category.tenantId).toBe(tenant1.id)
        }
      })

      // Verify no tenant 2 data is present
      expect(userData.accounts.find(a => a.name === 'T2 Secret Account')).toBeUndefined()
      expect(userData.transactions.find(t => t.description === 'T2 Secret Transaction')).toBeUndefined()
    })
  })

  describe('Aggregation and Statistical Leakage Prevention', () => {
    it('should prevent data leakage through aggregation functions', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'agg-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'agg-tenant-2' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id,
        balance: 10000.00
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id,
        balance: 50000.00
      })

      // Create transactions with different patterns for each tenant
      const t1Amounts = [100, 200, 300, 400, 500] // Total: 1500, Avg: 300
      const t2Amounts = [1000, 2000, 3000, 4000, 5000] // Total: 15000, Avg: 3000

      for (const [index, amount] of t1Amounts.entries()) {
        await testFactory.createTransaction({
          tenantId: tenant1.id,
          userId: user1.id,
          accountId: account1.id,
          amount,
          description: `T1 Transaction ${index + 1}`
        })
      }

      for (const [index, amount] of t2Amounts.entries()) {
        await testFactory.createTransaction({
          tenantId: tenant2.id,
          userId: user2.id,
          accountId: account2.id,
          amount,
          description: `T2 Transaction ${index + 1}`
        })
      }

      // Test aggregations from tenant 1 context
      await setTenantContext(prisma, tenant1.id)

      const t1Aggregation = await prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
        _min: { amount: true },
        _max: { amount: true }
      })

      expect(t1Aggregation._count).toBe(5)
      expect(Number(t1Aggregation._sum.amount)).toBe(1500)
      expect(Number(t1Aggregation._avg.amount)).toBe(300)
      expect(Number(t1Aggregation._min.amount)).toBe(100)
      expect(Number(t1Aggregation._max.amount)).toBe(500)

      // Test groupBy aggregation
      const t1GroupBy = await prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true }
      })

      expect(t1GroupBy.every(group => group._count <= 5)).toBe(true)
      expect(t1GroupBy.every(group => Number(group._sum.amount) <= 1500)).toBe(true)

      // Test aggregations from tenant 2 context
      await setTenantContext(prisma, tenant2.id)

      const t2Aggregation = await prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
        _min: { amount: true },
        _max: { amount: true }
      })

      expect(t2Aggregation._count).toBe(5)
      expect(Number(t2Aggregation._sum.amount)).toBe(15000)
      expect(Number(t2Aggregation._avg.amount)).toBe(3000)
      expect(Number(t2Aggregation._min.amount)).toBe(1000)
      expect(Number(t2Aggregation._max.amount)).toBe(5000)

      // Test account balance aggregation
      const accountAggregation = await prisma.account.aggregate({
        _sum: { balance: true },
        _avg: { balance: true }
      })

      expect(Number(accountAggregation._sum.balance)).toBe(50000) // Only tenant 2's account
      expect(Number(accountAggregation._avg.balance)).toBe(50000)

      // Verify no cross-tenant aggregation leakage
      expect(t1Aggregation._sum.amount).not.toEqual(t2Aggregation._sum.amount)
      expect(t1Aggregation._avg.amount).not.toEqual(t2Aggregation._avg.amount)
    })

    it('should prevent statistical inference attacks', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'stat-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'stat-tenant-2' })

      // Create users with predictable patterns
      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'predictable1@test.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'predictable2@test.com'
      })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id
      })

      // Create transactions with specific patterns that could leak information
      const sensitiveAmount1 = 12345.67
      const sensitiveAmount2 = 98765.43

      await testFactory.createTransaction({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        amount: sensitiveAmount1,
        description: 'Sensitive T1 Transaction'
      })

      await testFactory.createTransaction({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        amount: sensitiveAmount2,
        description: 'Sensitive T2 Transaction'
      })

      // Add noise transactions to prevent easy inference
      for (let i = 0; i < 10; i++) {
        await testFactory.createTransaction({
          tenantId: tenant1.id,
          userId: user1.id,
          accountId: account1.id,
          amount: Math.random() * 1000,
          description: `Noise T1 Transaction ${i + 1}`
        })

        await testFactory.createTransaction({
          tenantId: tenant2.id,
          userId: user2.id,
          accountId: account2.id,
          amount: Math.random() * 1000,
          description: `Noise T2 Transaction ${i + 1}`
        })
      }

      // Attempt statistical inference from tenant 1
      await setTenantContext(prisma, tenant1.id)

      // Try to infer information about specific amounts
      const exactAmountQuery = await prisma.transaction.findMany({
        where: {
          amount: sensitiveAmount2 // Tenant 2's sensitive amount
        }
      })

      expect(exactAmountQuery).toHaveLength(0)

      // Try to use statistical queries to infer patterns
      const rangeQuery = await prisma.transaction.findMany({
        where: {
          amount: {
            gte: sensitiveAmount2 - 1000,
            lte: sensitiveAmount2 + 1000
          }
        }
      })

      // Should only return transactions from tenant 1, if any
      expect(rangeQuery.every(t => t.tenantId === tenant1.id)).toBe(true)

      // Try to use aggregation to infer total amounts across tenants
      const totalAggregation = await prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true
      })

      // Should only aggregate tenant 1's data
      expect(totalAggregation._count).toBe(11) // 1 sensitive + 10 noise
      expect(Number(totalAggregation._sum.amount)).not.toEqual(
        sensitiveAmount1 + sensitiveAmount2 + 20 * 500 // Combined totals
      )

      // Verify from tenant 2 context
      await setTenantContext(prisma, tenant2.id)

      const t2ExactAmountQuery = await prisma.transaction.findMany({
        where: {
          amount: sensitiveAmount1 // Tenant 1's sensitive amount
        }
      })

      expect(t2ExactAmountQuery).toHaveLength(0)

      // Count query should only see tenant 2's data
      const t2Count = await prisma.transaction.count()
      expect(t2Count).toBe(11) // 1 sensitive + 10 noise for tenant 2
    })

    it('should prevent timing-based information leakage', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'timing-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'timing-tenant-2' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id
      })

      // Create different amounts of data for each tenant
      // Tenant 1: Small dataset
      for (let i = 0; i < 10; i++) {
        await testFactory.createTransaction({
          tenantId: tenant1.id,
          userId: user1.id,
          accountId: account1.id,
          amount: Math.random() * 100,
          description: `T1 Small Dataset Transaction ${i + 1}`
        })
      }

      // Tenant 2: Large dataset
      const largeDatasetSize = 1000
      const t2TransactionData = Array(largeDatasetSize).fill(0).map((_, i) => ({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        amount: Math.random() * 100,
        type: 'EXPENSE' as const,
        description: `T2 Large Dataset Transaction ${i + 1}`,
        date: new Date()
      }))

      await prisma.transaction.createMany({
        data: t2TransactionData
      })

      // Measure query times from tenant 1 (small dataset)
      await setTenantContext(prisma, tenant1.id)

      const { duration: t1QueryTime1 } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          orderBy: { date: 'desc' },
          take: 100
        })
      })

      const { duration: t1QueryTime2 } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.aggregate({
          _count: true,
          _sum: { amount: true }
        })
      })

      // Measure query times from tenant 2 (large dataset)
      await setTenantContext(prisma, tenant2.id)

      const { duration: t2QueryTime1 } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          orderBy: { date: 'desc' },
          take: 100
        })
      })

      const { duration: t2QueryTime2 } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.aggregate({
          _count: true,
          _sum: { amount: true }
        })
      })

      // Timing should not reveal information about other tenants' data size
      // Both tenants should have reasonable performance
      expect(t1QueryTime1).toBeLessThan(5000)
      expect(t1QueryTime2).toBeLessThan(5000)
      expect(t2QueryTime1).toBeLessThan(5000)
      expect(t2QueryTime2).toBeLessThan(5000)

      // The difference shouldn't be dramatic enough to infer other tenant's data size
      const timingRatio1 = Math.max(t1QueryTime1, t2QueryTime1) / Math.min(t1QueryTime1, t2QueryTime1)
      const timingRatio2 = Math.max(t1QueryTime2, t2QueryTime2) / Math.min(t1QueryTime2, t2QueryTime2)

      // Ratios should not be extremely different (allowing for some variation)
      expect(timingRatio1).toBeLessThan(10)
      expect(timingRatio2).toBeLessThan(10)

      // Verify query results are properly isolated
      await setTenantContext(prisma, tenant1.id)
      const t1Results = await prisma.transaction.findMany()
      expect(t1Results).toHaveLength(10)

      await setTenantContext(prisma, tenant2.id)
      const t2Results = await prisma.transaction.findMany()
      expect(t2Results).toHaveLength(largeDatasetSize)
    })
  })

  describe('Cache and Memory-Based Leakage Prevention', () => {
    it('should prevent cache-based data leakage between tenants', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'cache-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'cache-tenant-2' })

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'cache1@test.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'cache2@test.com'
      })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id,
        name: 'T1 Cache Test Account'
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id,
        name: 'T2 Cache Test Account'
      })

      // Access data from tenant 1
      await setTenantContext(prisma, tenant1.id)

      const t1User = await prisma.user.findUnique({
        where: { id: user1.id },
        include: { accounts: true }
      })

      expect(t1User).toBeTruthy()
      expect(t1User!.accounts[0].name).toBe('T1 Cache Test Account')

      // Query same user ID from tenant 2 context (should not return cached tenant 1 data)
      await setTenantContext(prisma, tenant2.id)

      const shouldBeNull = await prisma.user.findUnique({
        where: { id: user1.id },
        include: { accounts: true }
      })

      expect(shouldBeNull).toBeNull()

      // Access legitimate tenant 2 data
      const t2User = await prisma.user.findUnique({
        where: { id: user2.id },
        include: { accounts: true }
      })

      expect(t2User).toBeTruthy()
      expect(t2User!.accounts[0].name).toBe('T2 Cache Test Account')

      // Rapid context switching to test cache isolation
      for (let i = 0; i < 10; i++) {
        await setTenantContext(prisma, tenant1.id)
        const contextUser1 = await prisma.user.findUnique({
          where: { id: user1.id }
        })
        expect(contextUser1).toBeTruthy()
        expect(contextUser1!.tenantId).toBe(tenant1.id)

        await setTenantContext(prisma, tenant2.id)
        const contextUser2 = await prisma.user.findUnique({
          where: { id: user2.id }
        })
        expect(contextUser2).toBeTruthy()
        expect(contextUser2!.tenantId).toBe(tenant2.id)

        // Verify cross-access still fails
        const stillNull1 = await prisma.user.findUnique({
          where: { id: user1.id }
        })
        expect(stillNull1).toBeNull()

        await setTenantContext(prisma, tenant1.id)
        const stillNull2 = await prisma.user.findUnique({
          where: { id: user2.id }
        })
        expect(stillNull2).toBeNull()
      }
    })

    it('should prevent session-based data leakage', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'session-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'session-tenant-2' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      // Create sessions for both users
      const session1 = await prisma.session.create({
        data: {
          userId: user1.id,
          token: 'tenant1-session-token',
          expiresAt: new Date(Date.now() + 3600000)
        }
      })

      const session2 = await prisma.session.create({
        data: {
          userId: user2.id,
          token: 'tenant2-session-token',
          expiresAt: new Date(Date.now() + 3600000)
        }
      })

      // Simulate user session from tenant 1
      await setTenantContext(prisma, tenant1.id)

      // User 1 should see their own session
      const ownSession = await prisma.session.findUnique({
        where: { id: session1.id },
        include: { user: true }
      })

      expect(ownSession).toBeTruthy()
      expect(ownSession!.token).toBe('tenant1-session-token')
      expect(ownSession!.user.tenantId).toBe(tenant1.id)

      // User 1 should not see user 2's session
      const crossTenantSession = await prisma.session.findUnique({
        where: { id: session2.id },
        include: { user: true }
      })

      expect(crossTenantSession).toBeNull()

      // Session lookup by token should respect tenant isolation
      const sessionByToken = await prisma.session.findFirst({
        where: { token: 'tenant2-session-token' },
        include: { user: true }
      })

      expect(sessionByToken).toBeNull()

      // Simulate session cleanup from tenant 1 context
      await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date(Date.now() + 7200000) } // Delete sessions expiring in next 2 hours
        }
      })

      // Switch to tenant 2 and verify their session still exists
      await setTenantContext(prisma, tenant2.id)

      const tenant2Session = await prisma.session.findUnique({
        where: { id: session2.id }
      })

      expect(tenant2Session).toBeTruthy()
      expect(tenant2Session!.token).toBe('tenant2-session-token')

      // Verify tenant 1's session was deleted
      await setTenantContext(prisma, tenant1.id)

      const deletedSession = await prisma.session.findUnique({
        where: { id: session1.id }
      })

      expect(deletedSession).toBeNull()
    })

    it('should prevent memory-based attacks through large data operations', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'memory-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'memory-tenant-2' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id
      })

      // Create large dataset for tenant 1
      const largeDataset1Size = 5000
      const t1Data = Array(largeDataset1Size).fill(0).map((_, i) => ({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        amount: Math.random() * 1000,
        type: 'EXPENSE' as const,
        description: `T1 Memory Test Transaction ${i + 1}`,
        date: new Date()
      }))

      await prisma.transaction.createMany({ data: t1Data })

      // Create smaller dataset for tenant 2
      const smallDataset2Size = 100
      const t2Data = Array(smallDataset2Size).fill(0).map((_, i) => ({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        amount: Math.random() * 1000,
        type: 'INCOME' as const,
        description: `T2 Memory Test Transaction ${i + 1}`,
        date: new Date()
      }))

      await prisma.transaction.createMany({ data: t2Data })

      // Test large data operation from tenant 1
      await setTenantContext(prisma, tenant1.id)

      const t1LargeQuery = await prisma.transaction.findMany({
        include: {
          account: { include: { user: true } },
          user: true
        },
        take: 1000
      })

      expect(t1LargeQuery).toHaveLength(1000)
      expect(t1LargeQuery.every(t => t.tenantId === tenant1.id)).toBe(true)

      // Immediately switch to tenant 2 and perform operations
      await setTenantContext(prisma, tenant2.id)

      const t2Query = await prisma.transaction.findMany({
        include: {
          account: { include: { user: true } },
          user: true
        }
      })

      expect(t2Query).toHaveLength(smallDataset2Size)
      expect(t2Query.every(t => t.tenantId === tenant2.id)).toBe(true)

      // Verify no data bleeding occurred
      expect(t2Query.find(t => t.description.includes('T1 Memory Test'))).toBeUndefined()

      // Test memory-intensive aggregation from tenant 2
      const t2Aggregation = await prisma.transaction.aggregate({
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true }
      })

      expect(t2Aggregation._count).toBe(smallDataset2Size)

      // Switch back to tenant 1 and verify isolation is maintained
      await setTenantContext(prisma, tenant1.id)

      const t1Aggregation = await prisma.transaction.aggregate({
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true }
      })

      expect(t1Aggregation._count).toBe(largeDataset1Size)

      // Memory usage patterns should not reveal information about other tenants
      expect(t1Aggregation._count).not.toBe(t2Aggregation._count)
      expect(t1Aggregation._sum.amount).not.toEqual(t2Aggregation._sum.amount)
    })
  })

  describe('Error-Based Information Leakage Prevention', () => {
    it('should prevent information disclosure through error messages', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'error-tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'error-tenant-2' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      // Set tenant 1 context
      await setTenantContext(prisma, tenant1.id)

      // Attempt operations on tenant 2 data and verify error messages don't leak information
      try {
        await prisma.user.update({
          where: { id: user2.id },
          data: { firstName: 'Should Fail' }
        })

        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        // Error message should not reveal that the user exists in another tenant
        const errorMessage = error.message.toLowerCase()
        expect(errorMessage).not.toContain('tenant')
        expect(errorMessage).not.toContain(user2.email)
        expect(errorMessage).not.toContain(tenant2.id)
      }

      try {
        await prisma.user.delete({
          where: { id: user2.id }
        })

        expect(false).toBe(true) // Should not reach here
      } catch (error) {
        // Error should not leak information about the record's existence
        const errorMessage = error.message.toLowerCase()
        expect(errorMessage).not.toContain('exists')
        expect(errorMessage).not.toContain('found')
        expect(errorMessage).not.toContain(tenant2.id)
      }

      // Test constraint violation errors don't leak cross-tenant information
      try {
        // Attempt to create user with same email as user2 (in different tenant)
        await prisma.user.create({
          data: {
            tenantId: tenant1.id,
            email: user2.email, // This should be allowed since it's different tenant
            firstName: 'Different',
            lastName: 'Tenant',
            password: 'password'
          }
        })

        // This should succeed since emails can be duplicated across tenants
        expect(true).toBe(true)
      } catch (error) {
        // If it fails, error should not reveal information about user2
        const errorMessage = error.message.toLowerCase()
        expect(errorMessage).not.toContain(tenant2.id)
      }
    })

    it('should prevent timing-based error information leakage', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'timing-error-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'timing-error-2' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      await setTenantContext(prisma, tenant1.id)

      // Measure timing for operations on non-existent vs cross-tenant records
      const nonExistentId = 'non-existent-id-12345'

      // Time for non-existent record
      const { duration: nonExistentTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        try {
          await prisma.user.update({
            where: { id: nonExistentId },
            data: { firstName: 'Should Fail' }
          })
        } catch (error) {
          // Expected
        }
      })

      // Time for cross-tenant record
      const { duration: crossTenantTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        try {
          await prisma.user.update({
            where: { id: user2.id },
            data: { firstName: 'Should Fail' }
          })
        } catch (error) {
          // Expected
        }
      })

      // Timing should not significantly differ between non-existent and cross-tenant
      const timingRatio = Math.max(nonExistentTime, crossTenantTime) / Math.min(nonExistentTime, crossTenantTime)
      expect(timingRatio).toBeLessThan(5) // Allow some variance but not significant

      // Both should complete relatively quickly
      expect(nonExistentTime).toBeLessThan(1000)
      expect(crossTenantTime).toBeLessThan(1000)
    })
  })
})