import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, DatabaseTestUtils } from '../utils/test-utilities'

describe('Row Level Security (RLS) Policy Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('RLS Setup and Configuration', () => {
    it('should have RLS enabled on all tenant-aware tables', async () => {
      const tenantAwareTables = [
        'users',
        'accounts',
        'transactions',
        'categories',
        'budgets',
        'whatsapp_chats',
        'audit_logs'
      ]

      for (const table of tenantAwareTables) {
        const rlsEnabled = await DatabaseTestUtils.checkRLSEnabled(prisma, table)
        expect(rlsEnabled).toBe(true)
      }
    })

    it('should have tenant isolation policies on all tenant-aware tables', async () => {
      const tenantAwareTables = [
        'users',
        'accounts',
        'transactions',
        'categories',
        'budgets',
        'whatsapp_chats',
        'audit_logs'
      ]

      for (const table of tenantAwareTables) {
        const policyExists = await DatabaseTestUtils.checkPolicyExists(prisma, table, 'tenant_isolation')
        expect(policyExists).toBe(true)
      }
    })

    it('should have current_tenant_id() function available', async () => {
      const result = await prisma.$queryRaw`SELECT current_tenant_id() as tenant_id`
      expect(result).toBeDefined()
    })

    it('should have set_tenant_context() function available', async () => {
      await expect(
        prisma.$executeRaw`SELECT set_tenant_context('test-tenant-id')`
      ).resolves.not.toThrow()
    })
  })

  describe('RLS Policy Enforcement - Users Table', () => {
    it('should isolate users by tenant', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'tenant-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'tenant-2' })

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'user1@tenant1.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'user2@tenant2.com'
      })

      // Set tenant 1 context and query users
      await setTenantContext(prisma, tenant1.id)
      const tenant1Users = await prisma.user.findMany()

      expect(tenant1Users).toHaveLength(1)
      expect(tenant1Users[0].id).toBe(user1.id)
      expect(tenant1Users[0].tenantId).toBe(tenant1.id)

      // Set tenant 2 context and query users
      await setTenantContext(prisma, tenant2.id)
      const tenant2Users = await prisma.user.findMany()

      expect(tenant2Users).toHaveLength(1)
      expect(tenant2Users[0].id).toBe(user2.id)
      expect(tenant2Users[0].tenantId).toBe(tenant2.id)
    })

    it('should prevent cross-tenant user access', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      // Set tenant 1 context and try to access user from tenant 2
      await setTenantContext(prisma, tenant1.id)
      const crossTenantUser = await prisma.user.findUnique({
        where: { id: user2.id }
      })

      expect(crossTenantUser).toBeNull()
    })

    it('should prevent user creation in wrong tenant context', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      // Set tenant 1 context but try to create user for tenant 2
      await setTenantContext(prisma, tenant1.id)

      await expect(
        prisma.user.create({
          data: {
            tenantId: tenant2.id, // Different tenant than context
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            password: 'hashedpassword'
          }
        })
      ).rejects.toThrow()
    })

    it('should allow user updates only within tenant context', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      // Set tenant 1 context and update user 1 (should work)
      await setTenantContext(prisma, tenant1.id)
      const updatedUser1 = await prisma.user.update({
        where: { id: user1.id },
        data: { firstName: 'Updated Name' }
      })

      expect(updatedUser1.firstName).toBe('Updated Name')

      // Try to update user 2 while in tenant 1 context (should fail)
      await expect(
        prisma.user.update({
          where: { id: user2.id },
          data: { firstName: 'Should Fail' }
        })
      ).rejects.toThrow()
    })
  })

  describe('RLS Policy Enforcement - Transactions Table', () => {
    it('should isolate transactions by tenant', async () => {
      const setup1 = await testFactory.createTenantSetup({ slug: 'tenant-1' })
      const setup2 = await testFactory.createTenantSetup({ slug: 'tenant-2' })

      const transaction1 = await testFactory.createTransaction({
        tenantId: setup1.tenant.id,
        userId: setup1.users.regular.id,
        accountId: setup1.accounts.checking.id
      })

      const transaction2 = await testFactory.createTransaction({
        tenantId: setup2.tenant.id,
        userId: setup2.users.regular.id,
        accountId: setup2.accounts.checking.id
      })

      // Set tenant 1 context
      await setTenantContext(prisma, setup1.tenant.id)
      const tenant1Transactions = await prisma.transaction.findMany()

      expect(tenant1Transactions).toHaveLength(1)
      expect(tenant1Transactions[0].id).toBe(transaction1.id)

      // Set tenant 2 context
      await setTenantContext(prisma, setup2.tenant.id)
      const tenant2Transactions = await prisma.transaction.findMany()

      expect(tenant2Transactions).toHaveLength(1)
      expect(tenant2Transactions[0].id).toBe(transaction2.id)
    })

    it('should prevent cross-tenant transaction queries with JOIN operations', async () => {
      const setup1 = await testFactory.createTenantSetup()
      const setup2 = await testFactory.createTenantSetup()

      await testFactory.createTransaction({
        tenantId: setup1.tenant.id,
        userId: setup1.users.regular.id,
        accountId: setup1.accounts.checking.id
      })

      await testFactory.createTransaction({
        tenantId: setup2.tenant.id,
        userId: setup2.users.regular.id,
        accountId: setup2.accounts.checking.id
      })

      // Set tenant 1 context and query with joins
      await setTenantContext(prisma, setup1.tenant.id)
      const transactionsWithAccount = await prisma.transaction.findMany({
        include: {
          account: true,
          user: true
        }
      })

      expect(transactionsWithAccount).toHaveLength(1)
      expect(transactionsWithAccount[0].tenantId).toBe(setup1.tenant.id)
      expect(transactionsWithAccount[0].account.tenantId).toBe(setup1.tenant.id)
      expect(transactionsWithAccount[0].user.tenantId).toBe(setup1.tenant.id)
    })

    it('should prevent transaction aggregations across tenants', async () => {
      const setup1 = await testFactory.createTenantSetup()
      const setup2 = await testFactory.createTenantSetup()

      // Create multiple transactions for each tenant
      await Promise.all([
        testFactory.createTransaction({
          tenantId: setup1.tenant.id,
          userId: setup1.users.regular.id,
          accountId: setup1.accounts.checking.id,
          amount: 100
        }),
        testFactory.createTransaction({
          tenantId: setup1.tenant.id,
          userId: setup1.users.regular.id,
          accountId: setup1.accounts.checking.id,
          amount: 200
        }),
        testFactory.createTransaction({
          tenantId: setup2.tenant.id,
          userId: setup2.users.regular.id,
          accountId: setup2.accounts.checking.id,
          amount: 300
        })
      ])

      // Set tenant 1 context and perform aggregation
      await setTenantContext(prisma, setup1.tenant.id)
      const tenant1Aggregation = await prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true
      })

      expect(tenant1Aggregation._count).toBe(2)
      expect(Number(tenant1Aggregation._sum.amount)).toBe(300)

      // Set tenant 2 context and perform aggregation
      await setTenantContext(prisma, setup2.tenant.id)
      const tenant2Aggregation = await prisma.transaction.aggregate({
        _sum: { amount: true },
        _count: true
      })

      expect(tenant2Aggregation._count).toBe(1)
      expect(Number(tenant2Aggregation._sum.amount)).toBe(300)
    })
  })

  describe('RLS Policy Enforcement - Account and Budget Tables', () => {
    it('should isolate accounts by tenant', async () => {
      const setup1 = await testFactory.createTenantSetup()
      const setup2 = await testFactory.createTenantSetup()

      // Set tenant 1 context
      await setTenantContext(prisma, setup1.tenant.id)
      const tenant1Accounts = await prisma.account.findMany()

      expect(tenant1Accounts).toHaveLength(2) // checking + savings
      expect(tenant1Accounts.every(acc => acc.tenantId === setup1.tenant.id)).toBe(true)

      // Set tenant 2 context
      await setTenantContext(prisma, setup2.tenant.id)
      const tenant2Accounts = await prisma.account.findMany()

      expect(tenant2Accounts).toHaveLength(2)
      expect(tenant2Accounts.every(acc => acc.tenantId === setup2.tenant.id)).toBe(true)
    })

    it('should isolate budgets by tenant', async () => {
      const setup1 = await testFactory.createTenantSetup()
      const setup2 = await testFactory.createTenantSetup()

      const budget1 = await testFactory.createBudget({
        tenantId: setup1.tenant.id,
        userId: setup1.users.regular.id,
        accountId: setup1.accounts.checking.id
      })

      const budget2 = await testFactory.createBudget({
        tenantId: setup2.tenant.id,
        userId: setup2.users.regular.id,
        accountId: setup2.accounts.checking.id
      })

      // Set tenant 1 context
      await setTenantContext(prisma, setup1.tenant.id)
      const tenant1Budgets = await prisma.budget.findMany()

      expect(tenant1Budgets).toHaveLength(1)
      expect(tenant1Budgets[0].id).toBe(budget1.id)

      // Set tenant 2 context
      await setTenantContext(prisma, setup2.tenant.id)
      const tenant2Budgets = await prisma.budget.findMany()

      expect(tenant2Budgets).toHaveLength(1)
      expect(tenant2Budgets[0].id).toBe(budget2.id)
    })

    it('should isolate categories by tenant', async () => {
      const setup1 = await testFactory.createTenantSetup()
      const setup2 = await testFactory.createTenantSetup()

      // Set tenant 1 context
      await setTenantContext(prisma, setup1.tenant.id)
      const tenant1Categories = await prisma.category.findMany()

      expect(tenant1Categories).toHaveLength(2) // income + expense
      expect(tenant1Categories.every(cat => cat.tenantId === setup1.tenant.id)).toBe(true)

      // Set tenant 2 context
      await setTenantContext(prisma, setup2.tenant.id)
      const tenant2Categories = await prisma.category.findMany()

      expect(tenant2Categories).toHaveLength(2)
      expect(tenant2Categories.every(cat => cat.tenantId === setup2.tenant.id)).toBe(true)
    })
  })

  describe('RLS Policy Enforcement - Audit Logs', () => {
    it('should isolate audit logs by tenant', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      // Create audit logs for different tenants
      await prisma.auditLog.create({
        data: {
          tenantId: tenant1.id,
          action: 'CREATE',
          resource: 'user',
          resourceId: 'user-1',
          newValues: { name: 'Test User 1' }
        }
      })

      await prisma.auditLog.create({
        data: {
          tenantId: tenant2.id,
          action: 'CREATE',
          resource: 'user',
          resourceId: 'user-2',
          newValues: { name: 'Test User 2' }
        }
      })

      // Set tenant 1 context
      await setTenantContext(prisma, tenant1.id)
      const tenant1Logs = await prisma.auditLog.findMany()

      expect(tenant1Logs).toHaveLength(1)
      expect(tenant1Logs[0].tenantId).toBe(tenant1.id)

      // Set tenant 2 context
      await setTenantContext(prisma, tenant2.id)
      const tenant2Logs = await prisma.auditLog.findMany()

      expect(tenant2Logs).toHaveLength(1)
      expect(tenant2Logs[0].tenantId).toBe(tenant2.id)
    })
  })

  describe('RLS Policy Edge Cases', () => {
    it('should return empty results when no tenant context is set', async () => {
      const setup = await testFactory.createTenantSetup()

      // Clear tenant context
      await clearTenantContext(prisma)

      // Queries should return empty results
      const users = await prisma.user.findMany()
      const transactions = await prisma.transaction.findMany()
      const accounts = await prisma.account.findMany()

      expect(users).toHaveLength(0)
      expect(transactions).toHaveLength(0)
      expect(accounts).toHaveLength(0)
    })

    it('should handle invalid tenant context gracefully', async () => {
      const setup = await testFactory.createTenantSetup()

      // Set invalid tenant context
      await setTenantContext(prisma, 'invalid-tenant-id')

      // Queries should return empty results
      const users = await prisma.user.findMany()
      const transactions = await prisma.transaction.findMany()

      expect(users).toHaveLength(0)
      expect(transactions).toHaveLength(0)
    })

    it('should prevent deletion across tenants', async () => {
      const setup1 = await testFactory.createTenantSetup()
      const setup2 = await testFactory.createTenantSetup()

      const user2 = setup2.users.regular

      // Set tenant 1 context and try to delete user from tenant 2
      await setTenantContext(prisma, setup1.tenant.id)

      await expect(
        prisma.user.delete({
          where: { id: user2.id }
        })
      ).rejects.toThrow()

      // Verify user still exists
      await setTenantContext(prisma, setup2.tenant.id)
      const existingUser = await prisma.user.findUnique({
        where: { id: user2.id }
      })

      expect(existingUser).toBeTruthy()
    })

    it('should handle concurrent tenant operations', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const operations = await Promise.all([
        // Concurrent operations in different tenant contexts
        (async () => {
          await setTenantContext(prisma, tenant1.id)
          return testFactory.createUser({
            tenantId: tenant1.id,
            email: 'concurrent1@example.com'
          })
        })(),
        (async () => {
          await setTenantContext(prisma, tenant2.id)
          return testFactory.createUser({
            tenantId: tenant2.id,
            email: 'concurrent2@example.com'
          })
        })()
      ])

      expect(operations).toHaveLength(2)
      expect(operations[0].tenantId).toBe(tenant1.id)
      expect(operations[1].tenantId).toBe(tenant2.id)
    })
  })
})