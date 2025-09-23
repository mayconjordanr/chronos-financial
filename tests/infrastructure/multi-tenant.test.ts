import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, SecurityTestUtils, PerformanceTestUtils } from '../utils/test-utilities'

describe('Multi-Tenant Isolation Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('Complete Tenant Isolation', () => {
    it('should completely isolate tenant data across all entities', async () => {
      // Create two complete tenant setups
      const tenant1Setup = await testFactory.createTenantSetup({
        name: 'Tenant One Corp',
        slug: 'tenant-one',
        domain: 'tenant1.chronos.app'
      })

      const tenant2Setup = await testFactory.createTenantSetup({
        name: 'Tenant Two LLC',
        slug: 'tenant-two',
        domain: 'tenant2.chronos.app'
      })

      // Create additional data for each tenant
      const transaction1 = await testFactory.createTransaction({
        tenantId: tenant1Setup.tenant.id,
        userId: tenant1Setup.users.regular.id,
        accountId: tenant1Setup.accounts.checking.id,
        categoryId: tenant1Setup.categories.expense.id,
        amount: 100,
        description: 'Tenant 1 Transaction'
      })

      const transaction2 = await testFactory.createTransaction({
        tenantId: tenant2Setup.tenant.id,
        userId: tenant2Setup.users.regular.id,
        accountId: tenant2Setup.accounts.checking.id,
        categoryId: tenant2Setup.categories.expense.id,
        amount: 200,
        description: 'Tenant 2 Transaction'
      })

      const budget1 = await testFactory.createBudget({
        tenantId: tenant1Setup.tenant.id,
        userId: tenant1Setup.users.regular.id,
        accountId: tenant1Setup.accounts.checking.id,
        name: 'Tenant 1 Budget'
      })

      const budget2 = await testFactory.createBudget({
        tenantId: tenant2Setup.tenant.id,
        userId: tenant2Setup.users.regular.id,
        accountId: tenant2Setup.accounts.checking.id,
        name: 'Tenant 2 Budget'
      })

      // Test isolation for tenant 1
      await setTenantContext(prisma, tenant1Setup.tenant.id)

      const tenant1Data = await prisma.user.findMany({
        include: {
          accounts: {
            include: {
              transactions: true
            }
          },
          budgets: true,
          transactions: true
        }
      })

      expect(tenant1Data).toHaveLength(2) // admin + regular user
      expect(tenant1Data.every(user => user.tenantId === tenant1Setup.tenant.id)).toBe(true)

      const allTenant1Transactions = tenant1Data.flatMap(user => user.transactions)
      expect(allTenant1Transactions).toHaveLength(1)
      expect(allTenant1Transactions[0].description).toBe('Tenant 1 Transaction')

      const allTenant1Budgets = tenant1Data.flatMap(user => user.budgets)
      expect(allTenant1Budgets).toHaveLength(1)
      expect(allTenant1Budgets[0].name).toBe('Tenant 1 Budget')

      // Test isolation for tenant 2
      await setTenantContext(prisma, tenant2Setup.tenant.id)

      const tenant2Data = await prisma.user.findMany({
        include: {
          accounts: {
            include: {
              transactions: true
            }
          },
          budgets: true,
          transactions: true
        }
      })

      expect(tenant2Data).toHaveLength(2) // admin + regular user
      expect(tenant2Data.every(user => user.tenantId === tenant2Setup.tenant.id)).toBe(true)

      const allTenant2Transactions = tenant2Data.flatMap(user => user.transactions)
      expect(allTenant2Transactions).toHaveLength(1)
      expect(allTenant2Transactions[0].description).toBe('Tenant 2 Transaction')

      const allTenant2Budgets = tenant2Data.flatMap(user => user.budgets)
      expect(allTenant2Budgets).toHaveLength(1)
      expect(allTenant2Budgets[0].name).toBe('Tenant 2 Budget')
    })

    it('should prevent any cross-tenant data leakage in complex queries', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'leak-test-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'leak-test-2' })

      // Create users with same email in different tenants
      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'sameemail@example.com',
        firstName: 'Tenant1User'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'sameemail@example.com',
        firstName: 'Tenant2User'
      })

      // Create accounts and transactions
      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id,
        name: 'Tenant 1 Account'
      })

      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id,
        name: 'Tenant 2 Account'
      })

      await testFactory.createTransaction({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        description: 'Tenant 1 Secret Transaction'
      })

      await testFactory.createTransaction({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        description: 'Tenant 2 Secret Transaction'
      })

      // Test that tenant 1 context cannot see tenant 2 data
      await setTenantContext(prisma, tenant1.id)

      // Complex query that might leak data if RLS is not properly implemented
      const complexQuery = await prisma.user.findMany({
        where: {
          email: 'sameemail@example.com'
        },
        include: {
          accounts: {
            include: {
              transactions: true
            }
          }
        }
      })

      expect(complexQuery).toHaveLength(1)
      expect(complexQuery[0].firstName).toBe('Tenant1User')
      expect(complexQuery[0].accounts[0].name).toBe('Tenant 1 Account')
      expect(complexQuery[0].accounts[0].transactions[0].description).toBe('Tenant 1 Secret Transaction')

      // Verify no data from tenant 2 is visible
      const allVisibleTransactions = complexQuery.flatMap(user =>
        user.accounts.flatMap(account => account.transactions)
      )
      expect(allVisibleTransactions.every(t => t.tenantId === tenant1.id)).toBe(true)
    })

    it('should maintain isolation during bulk operations', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

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

      // Create bulk transactions for each tenant
      const tenant1Transactions = Array(50).fill(0).map((_, i) => ({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        amount: 100 + i,
        type: 'EXPENSE' as const,
        description: `Tenant 1 Transaction ${i}`,
        date: new Date()
      }))

      const tenant2Transactions = Array(30).fill(0).map((_, i) => ({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        amount: 200 + i,
        type: 'INCOME' as const,
        description: `Tenant 2 Transaction ${i}`,
        date: new Date()
      }))

      // Bulk create transactions
      await prisma.transaction.createMany({ data: tenant1Transactions })
      await prisma.transaction.createMany({ data: tenant2Transactions })

      // Verify isolation in tenant 1 context
      await setTenantContext(prisma, tenant1.id)
      const tenant1Results = await prisma.transaction.findMany()

      expect(tenant1Results).toHaveLength(50)
      expect(tenant1Results.every(t => t.tenantId === tenant1.id)).toBe(true)
      expect(tenant1Results.every(t => t.description.includes('Tenant 1'))).toBe(true)

      // Verify isolation in tenant 2 context
      await setTenantContext(prisma, tenant2.id)
      const tenant2Results = await prisma.transaction.findMany()

      expect(tenant2Results).toHaveLength(30)
      expect(tenant2Results.every(t => t.tenantId === tenant2.id)).toBe(true)
      expect(tenant2Results.every(t => t.description.includes('Tenant 2'))).toBe(true)
    })
  })

  describe('Tenant Context Security', () => {
    it('should prevent privilege escalation through tenant context manipulation', async () => {
      const regularTenant = await testFactory.createTenant({ plan: 'FREE' })
      const premiumTenant = await testFactory.createTenant({ plan: 'PREMIUM' })

      const regularUser = await testFactory.createUser({
        tenantId: regularTenant.id,
        role: 'USER'
      })

      const premiumUser = await testFactory.createUser({
        tenantId: premiumTenant.id,
        role: 'TENANT_ADMIN'
      })

      // Set regular tenant context
      await setTenantContext(prisma, regularTenant.id)

      // Try to access premium tenant data (should fail)
      const unauthorizedAccess = await prisma.user.findUnique({
        where: { id: premiumUser.id }
      })

      expect(unauthorizedAccess).toBeNull()

      // Try to update premium tenant user (should fail)
      await expect(
        prisma.user.update({
          where: { id: premiumUser.id },
          data: { firstName: 'Hacked' }
        })
      ).rejects.toThrow()
    })

    it('should handle tenant context switching securely', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        firstName: 'User One'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        firstName: 'User Two'
      })

      // Start with tenant 1 context
      await setTenantContext(prisma, tenant1.id)
      let visibleUsers = await prisma.user.findMany()
      expect(visibleUsers).toHaveLength(1)
      expect(visibleUsers[0].firstName).toBe('User One')

      // Switch to tenant 2 context
      await setTenantContext(prisma, tenant2.id)
      visibleUsers = await prisma.user.findMany()
      expect(visibleUsers).toHaveLength(1)
      expect(visibleUsers[0].firstName).toBe('User Two')

      // Clear context
      await clearTenantContext(prisma)
      visibleUsers = await prisma.user.findMany()
      expect(visibleUsers).toHaveLength(0)

      // Switch back to tenant 1
      await setTenantContext(prisma, tenant1.id)
      visibleUsers = await prisma.user.findMany()
      expect(visibleUsers).toHaveLength(1)
      expect(visibleUsers[0].firstName).toBe('User One')
    })

    it('should prevent SQL injection through tenant context', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })

      // Attempt SQL injection through tenant context
      const maliciousTenantIds = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; SELECT * FROM users WHERE '1'='1",
        "admin'; DELETE FROM transactions; --"
      ]

      for (const maliciousId of maliciousTenantIds) {
        await expect(
          setTenantContext(prisma, maliciousId)
        ).resolves.not.toThrow() // Function should handle gracefully

        // Verify no data is visible with malicious context
        const users = await prisma.user.findMany()
        expect(users).toHaveLength(0)
      }

      // Verify legitimate data is still intact
      await setTenantContext(prisma, tenant.id)
      const legitimateUsers = await prisma.user.findMany()
      expect(legitimateUsers).toHaveLength(1)
      expect(legitimateUsers[0].id).toBe(user.id)
    })
  })

  describe('Tenant Isolation Performance', () => {
    it('should maintain performance with multiple tenants', async () => {
      // Create multiple tenants with data
      const tenantSetups = await Promise.all(
        Array(10).fill(0).map((_, i) =>
          testFactory.createTenantSetup({
            name: `Performance Tenant ${i}`,
            slug: `perf-tenant-${i}`
          })
        )
      )

      // Create transactions for each tenant
      for (const setup of tenantSetups) {
        await testFactory.createBulkTransactions(
          setup.tenant.id,
          setup.users.regular.id,
          setup.accounts.checking.id,
          setup.categories.expense.id,
          100
        )
      }

      // Test query performance for each tenant
      const performanceResults = []

      for (const setup of tenantSetups) {
        await setTenantContext(prisma, setup.tenant.id)

        const { duration } = await PerformanceTestUtils.measureQueryTime(async () => {
          return prisma.transaction.findMany({
            include: {
              account: true,
              category: true,
              user: true
            },
            orderBy: { date: 'desc' },
            take: 20
          })
        })

        performanceResults.push(duration)
      }

      // All queries should complete reasonably fast
      const avgDuration = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length
      const maxDuration = Math.max(...performanceResults)

      expect(avgDuration).toBeLessThan(500) // Average under 500ms
      expect(maxDuration).toBeLessThan(1000) // Max under 1 second
    })

    it('should scale with concurrent tenant operations', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'concurrent-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'concurrent-2' })
      const tenant3 = await testFactory.createTenant({ slug: 'concurrent-3' })

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })
      const user3 = await testFactory.createUser({ tenantId: tenant3.id })

      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id
      })
      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user2.id
      })
      const account3 = await testFactory.createAccount({
        tenantId: tenant3.id,
        userId: user3.id
      })

      // Concurrent operations across different tenants
      const concurrentOperations = await Promise.all([
        (async () => {
          await setTenantContext(prisma, tenant1.id)
          return testFactory.createBulkTransactions(tenant1.id, user1.id, account1.id, undefined, 50)
        })(),
        (async () => {
          await setTenantContext(prisma, tenant2.id)
          return testFactory.createBulkTransactions(tenant2.id, user2.id, account2.id, undefined, 50)
        })(),
        (async () => {
          await setTenantContext(prisma, tenant3.id)
          return testFactory.createBulkTransactions(tenant3.id, user3.id, account3.id, undefined, 50)
        })()
      ])

      // Verify all operations completed successfully
      expect(concurrentOperations).toHaveLength(3)
      expect(concurrentOperations[0]).toHaveLength(50)
      expect(concurrentOperations[1]).toHaveLength(50)
      expect(concurrentOperations[2]).toHaveLength(50)

      // Verify data isolation was maintained
      await setTenantContext(prisma, tenant1.id)
      const tenant1Transactions = await prisma.transaction.findMany()
      expect(tenant1Transactions).toHaveLength(50)
      expect(tenant1Transactions.every(t => t.tenantId === tenant1.id)).toBe(true)

      await setTenantContext(prisma, tenant2.id)
      const tenant2Transactions = await prisma.transaction.findMany()
      expect(tenant2Transactions).toHaveLength(50)
      expect(tenant2Transactions.every(t => t.tenantId === tenant2.id)).toBe(true)

      await setTenantContext(prisma, tenant3.id)
      const tenant3Transactions = await prisma.transaction.findMany()
      expect(tenant3Transactions).toHaveLength(50)
      expect(tenant3Transactions.every(t => t.tenantId === tenant3.id)).toBe(true)
    })
  })

  describe('Tenant Data Integrity', () => {
    it('should maintain referential integrity within tenant boundaries', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })
      const account = await testFactory.createAccount({
        tenantId: tenant.id,
        userId: user.id
      })
      const category = await testFactory.createCategory({ tenantId: tenant.id })

      const transaction = await testFactory.createTransaction({
        tenantId: tenant.id,
        userId: user.id,
        accountId: account.id,
        categoryId: category.id
      })

      await setTenantContext(prisma, tenant.id)

      // Verify all relationships are properly maintained
      const fullTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          user: true,
          account: true,
          category: true,
          tenant: true
        }
      })

      expect(fullTransaction).toBeTruthy()
      expect(fullTransaction!.user.tenantId).toBe(tenant.id)
      expect(fullTransaction!.account.tenantId).toBe(tenant.id)
      expect(fullTransaction!.category!.tenantId).toBe(tenant.id)
      expect(fullTransaction!.tenant.id).toBe(tenant.id)
    })

    it('should prevent orphaned records across tenants', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const account2 = await testFactory.createAccount({
        tenantId: tenant2.id,
        userId: user1.id // This should fail - cross-tenant reference
      })

      // Attempt to create transaction with cross-tenant references should fail
      await expect(
        testFactory.createTransaction({
          tenantId: tenant1.id,
          userId: user1.id,
          accountId: account2.id // Account from different tenant
        })
      ).rejects.toThrow()
    })

    it('should handle cascade deletions within tenant boundaries', async () => {
      const setup = await testFactory.createTenantSetup()

      const transaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        categoryId: setup.categories.expense.id
      })

      await setTenantContext(prisma, setup.tenant.id)

      // Delete user should cascade to related entities
      await prisma.user.delete({
        where: { id: setup.users.regular.id }
      })

      // Verify cascaded deletions
      const deletedTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id }
      })
      expect(deletedTransaction).toBeNull()

      const deletedAccounts = await prisma.account.findMany({
        where: { userId: setup.users.regular.id }
      })
      expect(deletedAccounts).toHaveLength(0)
    })
  })
})