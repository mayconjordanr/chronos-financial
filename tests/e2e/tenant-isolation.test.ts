import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, SecurityTestUtils, PerformanceTestUtils } from '../utils/test-utilities'

describe('End-to-End Tenant Isolation Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('Complete Tenant Data Isolation', () => {
    it('should maintain complete isolation across all entity types', async () => {
      // Create comprehensive setups for two tenants
      const tenant1Setup = await testFactory.createTenantSetup({
        name: 'Isolation Test Company 1',
        slug: 'isolation-company-1',
        plan: 'PREMIUM'
      })

      const tenant2Setup = await testFactory.createTenantSetup({
        name: 'Isolation Test Company 2',
        slug: 'isolation-company-2',
        plan: 'BASIC'
      })

      // Create comprehensive data for tenant 1
      await setTenantContext(prisma, tenant1Setup.tenant.id)

      const tenant1Data = {
        // Additional categories
        categories: await Promise.all([
          testFactory.createCategory({
            tenantId: tenant1Setup.tenant.id,
            name: 'T1 Food & Dining',
            color: '#FF0000'
          }),
          testFactory.createCategory({
            tenantId: tenant1Setup.tenant.id,
            name: 'T1 Transportation',
            color: '#00FF00'
          })
        ]),

        // Additional accounts
        accounts: await Promise.all([
          testFactory.createAccount({
            tenantId: tenant1Setup.tenant.id,
            userId: tenant1Setup.users.regular.id,
            name: 'T1 Credit Card',
            type: 'CREDIT_CARD',
            balance: -500.00
          }),
          testFactory.createAccount({
            tenantId: tenant1Setup.tenant.id,
            userId: tenant1Setup.users.admin.id,
            name: 'T1 Admin Account',
            type: 'CHECKING',
            balance: 10000.00
          })
        ]),

        // Transactions
        transactions: [],
        budgets: [],
        auditLogs: []
      }

      // Create transactions for tenant 1
      for (let i = 0; i < 20; i++) {
        const transaction = await testFactory.createTransaction({
          tenantId: tenant1Setup.tenant.id,
          userId: i % 2 === 0 ? tenant1Setup.users.regular.id : tenant1Setup.users.admin.id,
          accountId: i % 3 === 0 ? tenant1Data.accounts[0].id :
                    i % 3 === 1 ? tenant1Data.accounts[1].id : tenant1Setup.accounts.checking.id,
          categoryId: i % 2 === 0 ? tenant1Data.categories[0].id : tenant1Data.categories[1].id,
          amount: 50 + (i * 10),
          description: `T1 Transaction ${i + 1}`,
          tags: [`t1-tag-${i % 3}`, 'tenant1']
        })
        tenant1Data.transactions.push(transaction)
      }

      // Create budgets for tenant 1
      for (const category of tenant1Data.categories) {
        const budget = await testFactory.createBudget({
          tenantId: tenant1Setup.tenant.id,
          userId: tenant1Setup.users.regular.id,
          categoryId: category.id,
          name: `T1 ${category.name} Budget`,
          amount: 1000.00,
          period: 'MONTHLY'
        })
        tenant1Data.budgets.push(budget)
      }

      // Create audit logs for tenant 1
      for (let i = 0; i < 10; i++) {
        const auditLog = await prisma.auditLog.create({
          data: {
            tenantId: tenant1Setup.tenant.id,
            userId: tenant1Setup.users.regular.id,
            action: 'CREATE',
            resource: 'transaction',
            resourceId: tenant1Data.transactions[i].id,
            newValues: {
              amount: tenant1Data.transactions[i].amount,
              description: tenant1Data.transactions[i].description,
              tenant: 'tenant1'
            }
          }
        })
        tenant1Data.auditLogs.push(auditLog)
      }

      // Create comprehensive data for tenant 2
      await setTenantContext(prisma, tenant2Setup.tenant.id)

      const tenant2Data = {
        // Additional categories
        categories: await Promise.all([
          testFactory.createCategory({
            tenantId: tenant2Setup.tenant.id,
            name: 'T2 Entertainment',
            color: '#0000FF'
          }),
          testFactory.createCategory({
            tenantId: tenant2Setup.tenant.id,
            name: 'T2 Healthcare',
            color: '#FFFF00'
          })
        ]),

        // Additional accounts
        accounts: await Promise.all([
          testFactory.createAccount({
            tenantId: tenant2Setup.tenant.id,
            userId: tenant2Setup.users.regular.id,
            name: 'T2 Investment Account',
            type: 'INVESTMENT',
            balance: 25000.00
          }),
          testFactory.createAccount({
            tenantId: tenant2Setup.tenant.id,
            userId: tenant2Setup.users.admin.id,
            name: 'T2 Business Account',
            type: 'CHECKING',
            balance: 50000.00
          })
        ]),

        transactions: [],
        budgets: [],
        auditLogs: []
      }

      // Create transactions for tenant 2
      for (let i = 0; i < 15; i++) {
        const transaction = await testFactory.createTransaction({
          tenantId: tenant2Setup.tenant.id,
          userId: i % 2 === 0 ? tenant2Setup.users.regular.id : tenant2Setup.users.admin.id,
          accountId: i % 3 === 0 ? tenant2Data.accounts[0].id :
                    i % 3 === 1 ? tenant2Data.accounts[1].id : tenant2Setup.accounts.savings.id,
          categoryId: i % 2 === 0 ? tenant2Data.categories[0].id : tenant2Data.categories[1].id,
          amount: 75 + (i * 15),
          description: `T2 Transaction ${i + 1}`,
          tags: [`t2-tag-${i % 4}`, 'tenant2']
        })
        tenant2Data.transactions.push(transaction)
      }

      // Create budgets for tenant 2
      for (const category of tenant2Data.categories) {
        const budget = await testFactory.createBudget({
          tenantId: tenant2Setup.tenant.id,
          userId: tenant2Setup.users.regular.id,
          categoryId: category.id,
          name: `T2 ${category.name} Budget`,
          amount: 2000.00,
          period: 'QUARTERLY'
        })
        tenant2Data.budgets.push(budget)
      }

      // Create audit logs for tenant 2
      for (let i = 0; i < 8; i++) {
        const auditLog = await prisma.auditLog.create({
          data: {
            tenantId: tenant2Setup.tenant.id,
            userId: tenant2Setup.users.admin.id,
            action: 'UPDATE',
            resource: 'account',
            resourceId: tenant2Data.accounts[i % 2].id,
            oldValues: { balance: 1000 },
            newValues: { balance: 2000, tenant: 'tenant2' }
          }
        })
        tenant2Data.auditLogs.push(auditLog)
      }

      // Now test complete isolation by querying each tenant's data
      // Test Tenant 1 isolation
      await setTenantContext(prisma, tenant1Setup.tenant.id)

      const t1Users = await prisma.user.findMany({
        include: {
          accounts: true,
          transactions: true,
          budgets: true
        }
      })

      const t1Categories = await prisma.category.findMany()
      const t1Transactions = await prisma.transaction.findMany({
        include: { account: true, category: true }
      })
      const t1Budgets = await prisma.budget.findMany({
        include: { category: true }
      })
      const t1AuditLogs = await prisma.auditLog.findMany()

      // Verify Tenant 1 sees only its data
      expect(t1Users.every(u => u.tenantId === tenant1Setup.tenant.id)).toBe(true)
      expect(t1Categories.every(c => c.tenantId === tenant1Setup.tenant.id)).toBe(true)
      expect(t1Transactions.every(t => t.tenantId === tenant1Setup.tenant.id)).toBe(true)
      expect(t1Budgets.every(b => b.tenantId === tenant1Setup.tenant.id)).toBe(true)
      expect(t1AuditLogs.every(a => a.tenantId === tenant1Setup.tenant.id)).toBe(true)

      // Verify counts for tenant 1
      expect(t1Users).toHaveLength(2) // admin + regular
      expect(t1Categories).toHaveLength(4) // 2 from setup + 2 additional
      expect(t1Transactions).toHaveLength(20)
      expect(t1Budgets).toHaveLength(2)
      expect(t1AuditLogs).toHaveLength(10)

      // Verify no tenant 2 data is visible
      expect(t1Categories.find(c => c.name.startsWith('T2'))).toBeUndefined()
      expect(t1Transactions.find(t => t.description.startsWith('T2'))).toBeUndefined()
      expect(t1Budgets.find(b => b.name.startsWith('T2'))).toBeUndefined()

      // Test Tenant 2 isolation
      await setTenantContext(prisma, tenant2Setup.tenant.id)

      const t2Users = await prisma.user.findMany({
        include: {
          accounts: true,
          transactions: true,
          budgets: true
        }
      })

      const t2Categories = await prisma.category.findMany()
      const t2Transactions = await prisma.transaction.findMany({
        include: { account: true, category: true }
      })
      const t2Budgets = await prisma.budget.findMany({
        include: { category: true }
      })
      const t2AuditLogs = await prisma.auditLog.findMany()

      // Verify Tenant 2 sees only its data
      expect(t2Users.every(u => u.tenantId === tenant2Setup.tenant.id)).toBe(true)
      expect(t2Categories.every(c => c.tenantId === tenant2Setup.tenant.id)).toBe(true)
      expect(t2Transactions.every(t => t.tenantId === tenant2Setup.tenant.id)).toBe(true)
      expect(t2Budgets.every(b => b.tenantId === tenant2Setup.tenant.id)).toBe(true)
      expect(t2AuditLogs.every(a => a.tenantId === tenant2Setup.tenant.id)).toBe(true)

      // Verify counts for tenant 2
      expect(t2Users).toHaveLength(2) // admin + regular
      expect(t2Categories).toHaveLength(4) // 2 from setup + 2 additional
      expect(t2Transactions).toHaveLength(15)
      expect(t2Budgets).toHaveLength(2)
      expect(t2AuditLogs).toHaveLength(8)

      // Verify no tenant 1 data is visible
      expect(t2Categories.find(c => c.name.startsWith('T1'))).toBeUndefined()
      expect(t2Transactions.find(t => t.description.startsWith('T1'))).toBeUndefined()
      expect(t2Budgets.find(b => b.name.startsWith('T1'))).toBeUndefined()
    })

    it('should prevent cross-tenant operations in complex scenarios', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'cross-tenant-test-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'cross-tenant-test-2' })

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'user1@tenant1.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'user2@tenant2.com'
      })

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

      const category1 = await testFactory.createCategory({
        tenantId: tenant1.id,
        name: 'Tenant 1 Category'
      })

      const category2 = await testFactory.createCategory({
        tenantId: tenant2.id,
        name: 'Tenant 2 Category'
      })

      // Set tenant 1 context and attempt cross-tenant operations
      await setTenantContext(prisma, tenant1.id)

      // Should not be able to access tenant 2's user
      const crossUser = await prisma.user.findUnique({
        where: { id: user2.id }
      })
      expect(crossUser).toBeNull()

      // Should not be able to access tenant 2's account
      const crossAccount = await prisma.account.findUnique({
        where: { id: account2.id }
      })
      expect(crossAccount).toBeNull()

      // Should not be able to create transaction with tenant 2's account
      await expect(
        testFactory.createTransaction({
          tenantId: tenant1.id,
          userId: user1.id,
          accountId: account2.id, // Cross-tenant account
          amount: 100.00
        })
      ).rejects.toThrow()

      // Should not be able to create transaction with tenant 2's category
      await expect(
        testFactory.createTransaction({
          tenantId: tenant1.id,
          userId: user1.id,
          accountId: account1.id,
          categoryId: category2.id, // Cross-tenant category
          amount: 100.00
        })
      ).rejects.toThrow()

      // Should not be able to update tenant 2's user
      await expect(
        prisma.user.update({
          where: { id: user2.id },
          data: { firstName: 'Hacked' }
        })
      ).rejects.toThrow()

      // Should not be able to delete tenant 2's account
      await expect(
        prisma.account.delete({
          where: { id: account2.id }
        })
      ).rejects.toThrow()

      // Test reverse direction - set tenant 2 context
      await setTenantContext(prisma, tenant2.id)

      // Should not see tenant 1's data
      const t1User = await prisma.user.findUnique({
        where: { id: user1.id }
      })
      expect(t1User).toBeNull()

      const t1Account = await prisma.account.findUnique({
        where: { id: account1.id }
      })
      expect(t1Account).toBeNull()

      // Should not be able to perform operations on tenant 1's data
      await expect(
        prisma.user.update({
          where: { id: user1.id },
          data: { firstName: 'Also Hacked' }
        })
      ).rejects.toThrow()
    })

    it('should handle complex multi-entity relationships with isolation', async () => {
      const setup1 = await testFactory.createTenantSetup({ slug: 'complex-rel-1' })
      const setup2 = await testFactory.createTenantSetup({ slug: 'complex-rel-2' })

      // Create complex related data for tenant 1
      await setTenantContext(prisma, setup1.tenant.id)

      // Create parent-child category relationships
      const parentCategory = await testFactory.createCategory({
        tenantId: setup1.tenant.id,
        name: 'T1 Parent Category'
      })

      const childCategory = await testFactory.createCategory({
        tenantId: setup1.tenant.id,
        name: 'T1 Child Category',
        parentId: parentCategory.id
      })

      // Create transaction with complex relationships
      const transaction = await testFactory.createTransaction({
        tenantId: setup1.tenant.id,
        userId: setup1.users.regular.id,
        accountId: setup1.accounts.checking.id,
        categoryId: childCategory.id,
        amount: 150.00,
        description: 'Complex relationship transaction'
      })

      // Create budget tied to the parent category
      const budget = await testFactory.createBudget({
        tenantId: setup1.tenant.id,
        userId: setup1.users.regular.id,
        accountId: setup1.accounts.checking.id,
        categoryId: parentCategory.id,
        name: 'Parent Category Budget',
        amount: 500.00
      })

      // Create session for user
      const session = await prisma.session.create({
        data: {
          userId: setup1.users.regular.id,
          token: 'tenant1-session-token',
          expiresAt: new Date(Date.now() + 3600000)
        }
      })

      // Test complex query with all relationships from tenant 1 perspective
      const complexData = await prisma.user.findUnique({
        where: { id: setup1.users.regular.id },
        include: {
          tenant: true,
          accounts: {
            include: {
              transactions: {
                include: {
                  category: {
                    include: {
                      parent: true,
                      children: true
                    }
                  }
                }
              }
            }
          },
          budgets: {
            include: {
              category: {
                include: {
                  parent: true,
                  children: true
                }
              }
            }
          },
          sessions: true
        }
      })

      expect(complexData).toBeTruthy()
      expect(complexData!.tenant.slug).toBe('complex-rel-1')
      expect(complexData!.accounts).toHaveLength(2)
      expect(complexData!.budgets).toHaveLength(1)
      expect(complexData!.sessions).toHaveLength(1)

      const transactionWithCategory = complexData!.accounts
        .flatMap(acc => acc.transactions)
        .find(t => t.description === 'Complex relationship transaction')

      expect(transactionWithCategory).toBeTruthy()
      expect(transactionWithCategory!.category!.name).toBe('T1 Child Category')
      expect(transactionWithCategory!.category!.parent!.name).toBe('T1 Parent Category')

      // Create similar structure for tenant 2
      await setTenantContext(prisma, setup2.tenant.id)

      const t2ParentCategory = await testFactory.createCategory({
        tenantId: setup2.tenant.id,
        name: 'T2 Parent Category'
      })

      const t2ChildCategory = await testFactory.createCategory({
        tenantId: setup2.tenant.id,
        name: 'T2 Child Category',
        parentId: t2ParentCategory.id
      })

      // Test that tenant 2 can only see its own relationships
      const t2ComplexData = await prisma.user.findUnique({
        where: { id: setup2.users.regular.id },
        include: {
          tenant: true,
          accounts: {
            include: {
              transactions: {
                include: {
                  category: {
                    include: {
                      parent: true,
                      children: true
                    }
                  }
                }
              }
            }
          },
          budgets: {
            include: {
              category: {
                include: {
                  parent: true,
                  children: true
                }
              }
            }
          },
          sessions: true
        }
      })

      expect(t2ComplexData!.tenant.slug).toBe('complex-rel-2')
      expect(t2ComplexData!.sessions).toHaveLength(0) // No sessions created for tenant 2

      // Verify category hierarchy isolation
      const t2Categories = await prisma.category.findMany({
        include: {
          parent: true,
          children: true
        }
      })

      expect(t2Categories.every(cat => cat.tenantId === setup2.tenant.id)).toBe(true)
      expect(t2Categories.find(cat => cat.name.startsWith('T1'))).toBeUndefined()

      const t2ParentWithChildren = t2Categories.find(cat => cat.name === 'T2 Parent Category')
      expect(t2ParentWithChildren!.children).toHaveLength(1)
      expect(t2ParentWithChildren!.children[0].name).toBe('T2 Child Category')
    })
  })

  describe('High-Volume Tenant Isolation', () => {
    it('should maintain isolation under high data volume', async () => {
      // Create tenants with large amounts of data
      const tenant1 = await testFactory.createTenant({ slug: 'high-volume-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'high-volume-2' })

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'user@highvolume1.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'user@highvolume2.com'
      })

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
        name: 'HV1 Category'
      })

      const category2 = await testFactory.createCategory({
        tenantId: tenant2.id,
        name: 'HV2 Category'
      })

      // Create large volumes of data for each tenant
      const volumeSize = 1000

      // Tenant 1 data creation
      await setTenantContext(prisma, tenant1.id)
      const t1TransactionData = Array(volumeSize).fill(0).map((_, i) => ({
        tenantId: tenant1.id,
        userId: user1.id,
        accountId: account1.id,
        categoryId: category1.id,
        amount: 10 + (i % 100),
        type: 'EXPENSE' as const,
        description: `HV1 Transaction ${i + 1}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }))

      await prisma.transaction.createMany({
        data: t1TransactionData
      })

      // Tenant 2 data creation
      await setTenantContext(prisma, tenant2.id)
      const t2TransactionData = Array(volumeSize).fill(0).map((_, i) => ({
        tenantId: tenant2.id,
        userId: user2.id,
        accountId: account2.id,
        categoryId: category2.id,
        amount: 20 + (i % 150),
        type: 'INCOME' as const,
        description: `HV2 Transaction ${i + 1}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      }))

      await prisma.transaction.createMany({
        data: t2TransactionData
      })

      // Test isolation with high-volume queries
      await setTenantContext(prisma, tenant1.id)

      const { duration: t1QueryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        const t1Transactions = await prisma.transaction.findMany({
          include: {
            account: true,
            category: true,
            user: true
          },
          orderBy: { date: 'desc' },
          take: 500
        })

        expect(t1Transactions).toHaveLength(500)
        expect(t1Transactions.every(t => t.tenantId === tenant1.id)).toBe(true)
        expect(t1Transactions.every(t => t.description.startsWith('HV1'))).toBe(true)
        expect(t1Transactions.every(t => t.type === 'EXPENSE')).toBe(true)

        return t1Transactions
      })

      await setTenantContext(prisma, tenant2.id)

      const { duration: t2QueryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        const t2Transactions = await prisma.transaction.findMany({
          include: {
            account: true,
            category: true,
            user: true
          },
          orderBy: { date: 'desc' },
          take: 500
        })

        expect(t2Transactions).toHaveLength(500)
        expect(t2Transactions.every(t => t.tenantId === tenant2.id)).toBe(true)
        expect(t2Transactions.every(t => t.description.startsWith('HV2'))).toBe(true)
        expect(t2Transactions.every(t => t.type === 'INCOME')).toBe(true)

        return t2Transactions
      })

      // Performance should remain reasonable even with high volume
      expect(t1QueryTime).toBeLessThan(3000) // Less than 3 seconds
      expect(t2QueryTime).toBeLessThan(3000)

      // Test aggregation isolation
      await setTenantContext(prisma, tenant1.id)
      const t1Aggregation = await prisma.transaction.aggregate({
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true }
      })

      expect(t1Aggregation._count).toBe(volumeSize)

      await setTenantContext(prisma, tenant2.id)
      const t2Aggregation = await prisma.transaction.aggregate({
        _count: true,
        _sum: { amount: true },
        _avg: { amount: true }
      })

      expect(t2Aggregation._count).toBe(volumeSize)

      // Aggregations should be different due to different data patterns
      expect(t1Aggregation._sum.amount).not.toEqual(t2Aggregation._sum.amount)
    }, 60000)

    it('should handle concurrent high-volume operations across tenants', async () => {
      // Create multiple tenants for concurrent testing
      const tenants = await Promise.all(
        Array(3).fill(0).map((_, i) =>
          testFactory.createTenantSetup({
            name: `Concurrent Tenant ${i + 1}`,
            slug: `concurrent-tenant-${i + 1}`
          })
        )
      )

      // Run concurrent operations for each tenant
      const concurrentOperations = tenants.map(async (setup, index) => {
        await setTenantContext(prisma, setup.tenant.id)

        // Create high-volume data concurrently
        const operations = []

        // Create additional categories
        for (let i = 0; i < 5; i++) {
          operations.push(
            testFactory.createCategory({
              tenantId: setup.tenant.id,
              name: `Concurrent Cat ${index + 1}-${i + 1}`
            })
          )
        }

        const categories = await Promise.all(operations)

        // Create transactions in batches
        const batchSize = 100
        const batches = 5

        for (let batch = 0; batch < batches; batch++) {
          const transactionData = Array(batchSize).fill(0).map((_, i) => ({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: categories[i % categories.length].id,
            amount: (batch * batchSize + i + 1) * 5,
            type: i % 2 === 0 ? 'EXPENSE' : 'INCOME' as const,
            description: `Concurrent T${index + 1} B${batch + 1} Trans ${i + 1}`,
            date: new Date()
          }))

          await prisma.transaction.createMany({
            data: transactionData
          })
        }

        return {
          tenantId: setup.tenant.id,
          categoriesCreated: categories.length,
          transactionsCreated: batchSize * batches
        }
      })

      const results = await Promise.all(concurrentOperations)

      // Verify all operations completed successfully
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result.categoriesCreated).toBe(5)
        expect(result.transactionsCreated).toBe(500)
      })

      // Verify isolation - each tenant should only see its own data
      for (const [index, setup] of tenants.entries()) {
        await setTenantContext(prisma, setup.tenant.id)

        const tenantTransactions = await prisma.transaction.findMany({
          where: { description: { startsWith: `Concurrent T${index + 1}` } }
        })

        expect(tenantTransactions).toHaveLength(500)
        expect(tenantTransactions.every(t => t.tenantId === setup.tenant.id)).toBe(true)

        const tenantCategories = await prisma.category.findMany({
          where: { name: { startsWith: `Concurrent Cat ${index + 1}` } }
        })

        expect(tenantCategories).toHaveLength(5)
        expect(tenantCategories.every(c => c.tenantId === setup.tenant.id)).toBe(true)

        // Verify no cross-tenant data
        const crossTenantTransactions = await prisma.transaction.findMany({
          where: {
            description: {
              startsWith: 'Concurrent T',
              not: { startsWith: `Concurrent T${index + 1}` }
            }
          }
        })

        expect(crossTenantTransactions).toHaveLength(0)
      }
    }, 120000)
  })

  describe('Security and Attack Prevention', () => {
    it('should prevent tenant context manipulation attacks', async () => {
      const tenant1 = await testFactory.createTenant({ slug: 'security-test-1' })
      const tenant2 = await testFactory.createTenant({ slug: 'security-test-2' })

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'secure1@test.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'secure2@test.com'
      })

      // Set legitimate tenant context
      await setTenantContext(prisma, tenant1.id)

      // Create legitimate data
      const account1 = await testFactory.createAccount({
        tenantId: tenant1.id,
        userId: user1.id,
        name: 'Secure Account 1'
      })

      // Attempt to manipulate tenant context through malicious inputs
      const maliciousTenantIds = SecurityTestUtils.generateSqlInjectionPayloads()

      for (const maliciousId of maliciousTenantIds) {
        // Attempt to set malicious tenant context
        await setTenantContext(prisma, maliciousId)

        // Should not see any data with malicious context
        const users = await prisma.user.findMany()
        expect(users).toHaveLength(0)

        const accounts = await prisma.account.findMany()
        expect(accounts).toHaveLength(0)

        const transactions = await prisma.transaction.findMany()
        expect(transactions).toHaveLength(0)
      }

      // Verify legitimate data is still accessible with correct context
      await setTenantContext(prisma, tenant1.id)
      const legitimateUsers = await prisma.user.findMany()
      expect(legitimateUsers).toHaveLength(1)
      expect(legitimateUsers[0].id).toBe(user1.id)
    })

    it('should prevent injection attacks through tenant-scoped queries', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create test data
      const transaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: 100.00,
        description: 'Injection test transaction'
      })

      // Test various injection attempts in search queries
      const injectionPayloads = SecurityTestUtils.generateSqlInjectionPayloads()

      for (const payload of injectionPayloads) {
        // Attempt injection through description search
        const searchResults = await prisma.transaction.findMany({
          where: {
            description: { contains: payload, mode: 'insensitive' }
          }
        })

        // Should not return unexpected results or cause errors
        expect(Array.isArray(searchResults)).toBe(true)

        // Should only return results from current tenant if any match
        searchResults.forEach(result => {
          expect(result.tenantId).toBe(setup.tenant.id)
        })
      }

      // Test injection through amount filters
      for (const payload of injectionPayloads) {
        try {
          const amountResults = await prisma.transaction.findMany({
            where: {
              // This should fail gracefully for non-numeric payloads
              amount: { gte: parseFloat(payload) || 0 }
            }
          })

          amountResults.forEach(result => {
            expect(result.tenantId).toBe(setup.tenant.id)
          })
        } catch (error) {
          // Expected for non-numeric injection attempts
          expect(error).toBeTruthy()
        }
      }

      // Verify original data is still intact
      const originalTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id }
      })

      expect(originalTransaction).toBeTruthy()
      expect(originalTransaction!.description).toBe('Injection test transaction')
    })

    it('should handle session-based tenant isolation attacks', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      // Create sessions for both users
      const session1 = await prisma.session.create({
        data: {
          userId: user1.id,
          token: 'legitimate-token-1',
          expiresAt: new Date(Date.now() + 3600000)
        }
      })

      const session2 = await prisma.session.create({
        data: {
          userId: user2.id,
          token: 'legitimate-token-2',
          expiresAt: new Date(Date.now() + 3600000)
        }
      })

      // Set tenant 1 context and try to access tenant 2's session
      await setTenantContext(prisma, tenant1.id)

      const crossTenantSession = await prisma.session.findUnique({
        where: { id: session2.id },
        include: { user: true }
      })

      expect(crossTenantSession).toBeNull()

      // Try to access session by token (should use proper tenant filtering)
      const sessionByToken = await prisma.session.findMany({
        where: { token: 'legitimate-token-2' },
        include: { user: true }
      })

      expect(sessionByToken).toHaveLength(0)

      // Verify legitimate session is accessible
      const legitimateSession = await prisma.session.findUnique({
        where: { id: session1.id },
        include: { user: true }
      })

      expect(legitimateSession).toBeTruthy()
      expect(legitimateSession!.user.tenantId).toBe(tenant1.id)

      // Test session cleanup doesn't affect other tenants
      await prisma.session.deleteMany({
        where: { userId: user1.id }
      })

      // Verify tenant 2's session is still intact when switching context
      await setTenantContext(prisma, tenant2.id)

      const tenant2Session = await prisma.session.findUnique({
        where: { id: session2.id }
      })

      expect(tenant2Session).toBeTruthy()
      expect(tenant2Session!.token).toBe('legitimate-token-2')
    })
  })
})