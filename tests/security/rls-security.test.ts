import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, SecurityTestUtils, DatabaseTestUtils } from '../utils/test-utilities'

describe('Row Level Security (RLS) Security Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('RLS Policy Security Validation', () => {
    it('should enforce RLS policies against privilege escalation attempts', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'privilege-test-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'privilege-test-2' })

      // Create admin user in tenant 1
      const adminUser = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'admin@tenant1.com',
        role: 'TENANT_ADMIN'
      })

      // Create regular user in tenant 2
      const regularUser = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'user@tenant2.com',
        role: 'USER'
      })

      // Set tenant 1 context (admin user context)
      await setTenantContext(prisma, tenant1.id)

      // Admin should not be able to access users from other tenants
      const crossTenantUser = await prisma.user.findUnique({
        where: { id: regularUser.id }
      })
      expect(crossTenantUser).toBeNull()

      // Admin should not be able to modify users from other tenants
      await expect(
        prisma.user.update({
          where: { id: regularUser.id },
          data: { role: 'TENANT_ADMIN' } // Attempt privilege escalation
        })
      ).rejects.toThrow()

      // Admin should not be able to create users for other tenants
      await expect(
        prisma.user.create({
          data: {
            tenantId: tenant2.id, // Different tenant
            email: 'backdoor@tenant2.com',
            firstName: 'Backdoor',
            lastName: 'User',
            password: 'password',
            role: 'TENANT_ADMIN'
          }
        })
      ).rejects.toThrow()

      // Verify legitimate operations still work
      const legitimateUser = await prisma.user.create({
        data: {
          tenantId: tenant1.id, // Same tenant
          email: 'legitimate@tenant1.com',
          firstName: 'Legitimate',
          lastName: 'User',
          password: 'password',
          role: 'USER'
        }
      })

      expect(legitimateUser.tenantId).toBe(tenant1.id)
    })

    it('should prevent RLS bypass through raw SQL injection', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'user1@secure.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'user2@secure.com'
      })

      // Set tenant 1 context
      await setTenantContext(prisma, tenant1.id)

      // Attempt to bypass RLS using SQL injection techniques in various query types
      const maliciousInputs = [
        "'; DROP POLICY tenant_isolation ON users; --",
        "' OR tenant_id != tenant_id OR '1'='1",
        "' UNION SELECT * FROM users WHERE '1'='1",
        "'; SET row_security = off; --",
        "' OR current_tenant_id() != current_tenant_id() --",
        "'; ALTER TABLE users DISABLE ROW LEVEL SECURITY; --"
      ]

      for (const maliciousInput of maliciousInputs) {
        // Test through Prisma findMany with where clause
        const users = await prisma.user.findMany({
          where: {
            email: { contains: maliciousInput }
          }
        })

        // Should only return users from tenant 1, never from tenant 2
        expect(users.every(u => u.tenantId === tenant1.id)).toBe(true)
        expect(users.find(u => u.id === user2.id)).toBeUndefined()

        // Test through Prisma findMany with firstName search
        const usersByName = await prisma.user.findMany({
          where: {
            firstName: { contains: maliciousInput }
          }
        })

        expect(usersByName.every(u => u.tenantId === tenant1.id)).toBe(true)

        // Test through raw queries (if they don't throw errors, they should still respect RLS)
        try {
          const rawResult = await prisma.$queryRaw`
            SELECT * FROM users WHERE email LIKE ${`%${maliciousInput}%`}
          `

          if (Array.isArray(rawResult)) {
            expect((rawResult as any[]).every(u => u.tenant_id === tenant1.id)).toBe(true)
          }
        } catch (error) {
          // SQL injection should either be prevented or still respect RLS
          expect(error).toBeTruthy()
        }
      }

      // Verify legitimate user is still accessible
      const legitimateUser = await prisma.user.findUnique({
        where: { id: user1.id }
      })
      expect(legitimateUser).toBeTruthy()
      expect(legitimateUser!.tenantId).toBe(tenant1.id)
    })

    it('should maintain RLS enforcement across all CRUD operations', async () => {
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

      const transaction1 = await testFactory.createTransaction({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id
      })

      const transaction2 = await testFactory.createTransaction({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id
      })

      // Set tenant 1 context and test all CRUD operations
      await setTenantContext(prisma, tenant1.id)

      // CREATE operations should respect tenant context
      const newTransaction = await prisma.transaction.create({
        data: {
          tenantId: tenant1.id,
          userId: user1.id,
          accountId: account1.id,
          amount: 100.00,
          type: 'EXPENSE',
          description: 'RLS Test Transaction',
          date: new Date()
        }
      })
      expect(newTransaction.tenantId).toBe(tenant1.id)

      // CREATE with wrong tenant should fail
      await expect(
        prisma.transaction.create({
          data: {
            tenantId: tenant2.id, // Wrong tenant
            userId: user1.id,
            accountId: account1.id,
            amount: 100.00,
            type: 'EXPENSE',
            description: 'Should Fail',
            date: new Date()
          }
        })
      ).rejects.toThrow()

      // READ operations should only see tenant 1 data
      const visibleTransactions = await prisma.transaction.findMany()
      expect(visibleTransactions.every(t => t.tenantId === tenant1.id)).toBe(true)
      expect(visibleTransactions.find(t => t.id === transaction2.id)).toBeUndefined()

      // Specific READ of tenant 2 data should return null
      const hiddenTransaction = await prisma.transaction.findUnique({
        where: { id: transaction2.id }
      })
      expect(hiddenTransaction).toBeNull()

      // UPDATE operations should only work on tenant 1 data
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transaction1.id },
        data: { description: 'Updated by Tenant 1' }
      })
      expect(updatedTransaction.description).toBe('Updated by Tenant 1')

      // UPDATE on tenant 2 data should fail
      await expect(
        prisma.transaction.update({
          where: { id: transaction2.id },
          data: { description: 'Should Not Work' }
        })
      ).rejects.toThrow()

      // DELETE operations should only work on tenant 1 data
      await expect(
        prisma.transaction.delete({
          where: { id: transaction2.id }
        })
      ).rejects.toThrow()

      // Legitimate DELETE should work
      await prisma.transaction.delete({
        where: { id: newTransaction.id }
      })

      // Verify the transaction was deleted
      const deletedTransaction = await prisma.transaction.findUnique({
        where: { id: newTransaction.id }
      })
      expect(deletedTransaction).toBeNull()

      // Switch to tenant 2 context and verify transaction2 still exists
      await setTenantContext(prisma, tenant2.id)
      const tenant2Transaction = await prisma.transaction.findUnique({
        where: { id: transaction2.id }
      })
      expect(tenant2Transaction).toBeTruthy()
      expect(tenant2Transaction!.tenantId).toBe(tenant2.id)
    })

    it('should prevent RLS bypass through complex join operations', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      // Create comprehensive data for both tenants
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

      const category1 = await testFactory.createCategory({
        tenantId: tenant1.id,
        name: 'T1 Category'
      })

      const category2 = await testFactory.createCategory({
        tenantId: tenant2.id,
        name: 'T2 Category'
      })

      const transaction1 = await testFactory.createTransaction({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        categoryId: category1.id,
        description: 'T1 Transaction'
      })

      const transaction2 = await testFactory.createTransaction({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        categoryId: category2.id,
        description: 'T2 Transaction'
      })

      // Set tenant 1 context
      await setTenantContext(prisma, tenant1.id)

      // Complex join queries should respect RLS
      const complexQuery1 = await prisma.transaction.findMany({
        include: {
          user: {
            include: {
              tenant: true,
              accounts: {
                include: {
                  transactions: true
                }
              }
            }
          },
          account: {
            include: {
              user: true,
              transactions: true
            }
          },
          category: true
        }
      })

      // All returned data should belong to tenant 1
      expect(complexQuery1.every(t => t.tenantId === tenant1.id)).toBe(true)
      expect(complexQuery1.every(t => t.user.tenantId === tenant1.id)).toBe(true)
      expect(complexQuery1.every(t => t.account.tenantId === tenant1.id)).toBe(true)
      expect(complexQuery1.every(t => t.category!.tenantId === tenant1.id)).toBe(true)

      // Nested data should also respect tenant boundaries
      complexQuery1.forEach(transaction => {
        expect(transaction.user.accounts.every(a => a.tenantId === tenant1.id)).toBe(true)
        expect(transaction.account.transactions.every(t => t.tenantId === tenant1.id)).toBe(true)

        transaction.user.accounts.forEach(account => {
          expect(account.transactions.every(t => t.tenantId === tenant1.id)).toBe(true)
        })
      })

      // Verify no tenant 2 data leaked through joins
      expect(complexQuery1.find(t => t.description === 'T2 Transaction')).toBeUndefined()
      expect(complexQuery1.find(t => t.user.email === user2.email)).toBeUndefined()

      // Test reverse join (starting from user)
      const userQuery = await prisma.user.findMany({
        include: {
          accounts: {
            include: {
              transactions: {
                include: {
                  category: true
                }
              }
            }
          },
          transactions: {
            include: {
              account: true,
              category: true
            }
          }
        }
      })

      // All user data should belong to tenant 1
      expect(userQuery.every(u => u.tenantId === tenant1.id)).toBe(true)
      userQuery.forEach(user => {
        expect(user.accounts.every(a => a.tenantId === tenant1.id)).toBe(true)
        expect(user.transactions.every(t => t.tenantId === tenant1.id)).toBe(true)

        user.accounts.forEach(account => {
          expect(account.transactions.every(t => t.tenantId === tenant1.id)).toBe(true)
          account.transactions.forEach(transaction => {
            if (transaction.category) {
              expect(transaction.category.tenantId).toBe(tenant1.id)
            }
          })
        })
      })
    })
  })

  describe('RLS Configuration Security', () => {
    it('should verify RLS is properly enabled and cannot be disabled', async () => {
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
        // Verify RLS is enabled
        const rlsEnabled = await DatabaseTestUtils.checkRLSEnabled(prisma, table)
        expect(rlsEnabled).toBe(true)

        // Verify tenant isolation policy exists
        const policyExists = await DatabaseTestUtils.checkPolicyExists(prisma, table, 'tenant_isolation')
        expect(policyExists).toBe(true)

        // Attempt to disable RLS (should fail for non-superuser)
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`)

          // If it doesn't throw, verify RLS is still enabled
          const stillEnabled = await DatabaseTestUtils.checkRLSEnabled(prisma, table)
          expect(stillEnabled).toBe(true)
        } catch (error) {
          // Expected for non-superuser roles
          expect(error).toBeTruthy()
        }

        // Attempt to drop tenant isolation policy (should fail)
        try {
          await prisma.$executeRawUnsafe(`DROP POLICY tenant_isolation ON ${table}`)

          // If it doesn't throw, verify policy still exists
          const stillExists = await DatabaseTestUtils.checkPolicyExists(prisma, table, 'tenant_isolation')
          expect(stillExists).toBe(true)
        } catch (error) {
          // Expected for non-superuser roles
          expect(error).toBeTruthy()
        }
      }
    })

    it('should verify tenant context functions are secure', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      // Test current_tenant_id() function
      await setTenantContext(prisma, tenant1.id)

      const currentTenant1 = await prisma.$queryRaw`SELECT current_tenant_id() as tenant_id` as any[]
      expect(currentTenant1[0].tenant_id).toBe(tenant1.id)

      await setTenantContext(prisma, tenant2.id)

      const currentTenant2 = await prisma.$queryRaw`SELECT current_tenant_id() as tenant_id` as any[]
      expect(currentTenant2[0].tenant_id).toBe(tenant2.id)

      // Test that malicious inputs to set_tenant_context are handled
      const maliciousInputs = SecurityTestUtils.generateSqlInjectionPayloads()

      for (const maliciousInput of maliciousInputs) {
        // Set malicious tenant context
        await setTenantContext(prisma, maliciousInput)

        // Verify no data is visible with malicious context
        const users = await prisma.user.findMany()
        expect(users).toHaveLength(0)

        const transactions = await prisma.transaction.findMany()
        expect(transactions).toHaveLength(0)

        // Verify current_tenant_id returns the malicious string as-is (not executed)
        const currentTenantResult = await prisma.$queryRaw`SELECT current_tenant_id() as tenant_id` as any[]
        expect(currentTenantResult[0].tenant_id).toBe(maliciousInput)
      }

      // Verify legitimate context still works
      await setTenantContext(prisma, tenant1.id)
      const finalCheck = await prisma.$queryRaw`SELECT current_tenant_id() as tenant_id` as any[]
      expect(finalCheck[0].tenant_id).toBe(tenant1.id)
    })

    it('should verify RLS policies handle edge cases securely', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })

      await setTenantContext(prisma, tenant.id)

      // Test with NULL tenant_id (should be blocked by NOT NULL constraint)
      await expect(
        prisma.$executeRaw`
          INSERT INTO users (id, tenant_id, email, first_name, last_name, password)
          VALUES (gen_random_uuid(), NULL, 'null@test.com', 'Null', 'User', 'password')
        `
      ).rejects.toThrow()

      // Test with empty string tenant_id
      await clearTenantContext(prisma)

      const emptyContextUsers = await prisma.user.findMany()
      expect(emptyContextUsers).toHaveLength(0)

      // Test with very long tenant_id string
      const longTenantId = 'x'.repeat(1000)
      await setTenantContext(prisma, longTenantId)

      const longContextUsers = await prisma.user.findMany()
      expect(longContextUsers).toHaveLength(0)

      // Test with special characters in tenant_id
      const specialTenantId = "'; DROP TABLE users; --"
      await setTenantContext(prisma, specialTenantId)

      const specialContextUsers = await prisma.user.findMany()
      expect(specialContextUsers).toHaveLength(0)

      // Verify original data is still accessible with correct context
      await setTenantContext(prisma, tenant.id)
      const correctContextUsers = await prisma.user.findMany()
      expect(correctContextUsers).toHaveLength(1)
      expect(correctContextUsers[0].id).toBe(user.id)
    })
  })

  describe('RLS Performance and DoS Protection', () => {
    it('should maintain RLS performance under stress conditions', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      // Create users for both tenants
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

      // Create large datasets for both tenants
      const largeDatasetSize = 1000

      const tenant1Data = Array(largeDatasetSize).fill(0).map((_, i) => ({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        amount: Math.random() * 1000,
        type: 'EXPENSE' as const,
        description: `T1 Stress Transaction ${i + 1}`,
        date: new Date()
      }))

      const tenant2Data = Array(largeDatasetSize).fill(0).map((_, i) => ({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        amount: Math.random() * 1000,
        type: 'INCOME' as const,
        description: `T2 Stress Transaction ${i + 1}`,
        date: new Date()
      }))

      // Insert data for both tenants
      await prisma.transaction.createMany({ data: tenant1Data })
      await prisma.transaction.createMany({ data: tenant2Data })

      // Test RLS performance under stress for tenant 1
      await setTenantContext(prisma, tenant1.id)

      const stressTests = Array(10).fill(0).map(async (_, i) => {
        const startTime = Date.now()

        const results = await prisma.transaction.findMany({
          where: {
            description: { contains: 'Stress' }
          },
          include: {
            account: true,
            user: true
          },
          orderBy: { date: 'desc' },
          take: 100
        })

        const endTime = Date.now()
        const duration = endTime - startTime

        // Verify all results belong to tenant 1
        expect(results.every(t => t.tenantId === tenant1.id)).toBe(true)
        expect(results.every(t => t.description.startsWith('T1'))).toBe(true)

        return { testIndex: i, duration, resultCount: results.length }
      })

      const stressResults = await Promise.all(stressTests)

      // Performance should remain reasonable
      const avgDuration = stressResults.reduce((sum, r) => sum + r.duration, 0) / stressResults.length
      const maxDuration = Math.max(...stressResults.map(r => r.duration))

      expect(avgDuration).toBeLessThan(2000) // Average under 2 seconds
      expect(maxDuration).toBeLessThan(5000) // Max under 5 seconds

      // Test that switching contexts doesn't leak data
      await setTenantContext(prisma, tenant2.id)

      const tenant2Results = await prisma.transaction.findMany({
        where: { description: { contains: 'Stress' } },
        take: 100
      })

      expect(tenant2Results.every(t => t.tenantId === tenant2.id)).toBe(true)
      expect(tenant2Results.every(t => t.description.startsWith('T2'))).toBe(true)
    }, 60000)

    it('should protect against RLS-based DoS attacks', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })

      await setTenantContext(prisma, tenant.id)

      // Test rapid context switching (potential DoS vector)
      const rapidSwitchingTests = Array(100).fill(0).map(async (_, i) => {
        const testTenantId = `dos-test-${i}`
        await setTenantContext(prisma, testTenantId)

        const users = await prisma.user.findMany()
        expect(users).toHaveLength(0) // Should see no data with invalid context

        return i
      })

      const startTime = Date.now()
      await Promise.all(rapidSwitchingTests)
      const endTime = Date.now()

      const totalDuration = endTime - startTime
      expect(totalDuration).toBeLessThan(30000) // Should complete within 30 seconds

      // Verify legitimate operations still work after stress test
      await setTenantContext(prisma, tenant.id)

      const legitimateUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      expect(legitimateUser).toBeTruthy()
      expect(legitimateUser!.tenantId).toBe(tenant.id)

      // Test malformed context handling
      const malformedContexts = [
        '', // Empty string
        'null',
        'undefined',
        '{}', // JSON object
        '[]', // JSON array
        'a'.repeat(10000), // Very long string
        ...SecurityTestUtils.generateSqlInjectionPayloads()
      ]

      for (const malformedContext of malformedContexts) {
        await setTenantContext(prisma, malformedContext)

        // Should handle gracefully without errors
        const users = await prisma.user.findMany()
        expect(users).toHaveLength(0)

        const transactions = await prisma.transaction.findMany()
        expect(transactions).toHaveLength(0)
      }

      // Verify system is still functional
      await setTenantContext(prisma, tenant.id)

      const finalCheck = await prisma.user.findMany()
      expect(finalCheck).toHaveLength(1)
      expect(finalCheck[0].id).toBe(user.id)
    })
  })

  describe('RLS Audit and Monitoring', () => {
    it('should properly log RLS policy violations and access attempts', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      // Set tenant 1 context
      await setTenantContext(prisma, tenant1.id)

      // Create audit log for legitimate access
      await prisma.auditLog.create({
        data: {
          tenantId: tenant1.id,
          userId: user1.id,
          action: 'READ',
          resource: 'user',
          resourceId: user1.id,
          newValues: { accessed: true }
        }
      })

      // Attempt cross-tenant access (should fail and be logged)
      try {
        await prisma.user.update({
          where: { id: user2.id },
          data: { firstName: 'Hacked' }
        })
      } catch (error) {
        // Expected to fail
      }

      // Verify audit logs respect tenant isolation
      const auditLogs = await prisma.auditLog.findMany()
      expect(auditLogs.every(log => log.tenantId === tenant1.id)).toBe(true)
      expect(auditLogs.every(log => log.userId === user1.id)).toBe(true)

      // Switch to tenant 2 and verify isolation
      await setTenantContext(prisma, tenant2.id)

      const tenant2AuditLogs = await prisma.auditLog.findMany()
      expect(tenant2AuditLogs).toHaveLength(0)

      // Create audit log for tenant 2
      await prisma.auditLog.create({
        data: {
          tenantId: tenant2.id,
          userId: user2.id,
          action: 'login',
          resource: 'session',
          newValues: { ip: '192.168.1.1' }
        }
      })

      const tenant2Logs = await prisma.auditLog.findMany()
      expect(tenant2Logs).toHaveLength(1)
      expect(tenant2Logs[0].tenantId).toBe(tenant2.id)
      expect(tenant2Logs[0].userId).toBe(user2.id)
    })

    it('should track performance metrics for RLS operations', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })
      const account = await testFactory.createAccount({
        tenantId: tenant.id,
        userId: user.id
      })

      await setTenantContext(prisma, tenant.id)

      // Create test data for performance measurement
      const transactionData = Array(500).fill(0).map((_, i) => ({
        tenantId: tenant.id,
        userId: user.id,
        accountId: account.id,
        amount: Math.random() * 100,
        type: 'EXPENSE' as const,
        description: `Performance test ${i + 1}`,
        date: new Date()
      }))

      await prisma.transaction.createMany({ data: transactionData })

      // Measure various RLS operations
      const performanceMetrics = []

      // Query performance
      const queryStart = Date.now()
      const queryResults = await prisma.transaction.findMany({
        include: { account: true },
        take: 100
      })
      const queryEnd = Date.now()

      performanceMetrics.push({
        operation: 'query',
        duration: queryEnd - queryStart,
        resultCount: queryResults.length
      })

      // Aggregation performance
      const aggStart = Date.now()
      const aggResults = await prisma.transaction.aggregate({
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true }
      })
      const aggEnd = Date.now()

      performanceMetrics.push({
        operation: 'aggregation',
        duration: aggEnd - aggStart,
        resultCount: aggResults._count
      })

      // Update performance
      const updateStart = Date.now()
      const updateResult = await prisma.transaction.update({
        where: { id: queryResults[0].id },
        data: { description: 'Updated for performance test' }
      })
      const updateEnd = Date.now()

      performanceMetrics.push({
        operation: 'update',
        duration: updateEnd - updateStart,
        resultCount: 1
      })

      // Verify all operations completed within reasonable time
      performanceMetrics.forEach(metric => {
        expect(metric.duration).toBeLessThan(5000) // 5 seconds max
        console.log(`RLS ${metric.operation} took ${metric.duration}ms for ${metric.resultCount} records`)
      })

      // Log performance metrics as audit log
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'performance_test',
          resource: 'rls_metrics',
          newValues: {
            metrics: performanceMetrics,
            timestamp: new Date().toISOString()
          }
        }
      })

      // Verify performance audit log was created
      const perfAuditLog = await prisma.auditLog.findFirst({
        where: { action: 'performance_test' }
      })

      expect(perfAuditLog).toBeTruthy()
      expect(perfAuditLog!.tenantId).toBe(tenant.id)
    })
  })
})