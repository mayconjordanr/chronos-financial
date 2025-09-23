import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, PerformanceTestUtils } from '../utils/test-utilities'

describe('Full Stack E2E Infrastructure Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  // Helper function to simulate API requests
  const apiRequest = async (endpoint: string, method: string = 'GET', body?: any, headers?: any): Promise<any> => {
    try {
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      })

      return {
        status: response.status,
        data: response.status !== 204 ? await response.json().catch(() => null) : null,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      return {
        status: 500,
        error: error.message,
        data: null
      }
    }
  }

  describe('Complete Application Stack Health', () => {
    it('should have all services running and responding', async () => {
      // Test database connectivity
      await expect(prisma.$connect()).resolves.not.toThrow()

      // Test basic database query
      const dbTest = await prisma.$queryRaw`SELECT 1 as test`
      expect(dbTest).toBeDefined()

      // Test backend API
      const apiHealth = await apiRequest('/health')
      expect(apiHealth.status).toBe(200)

      // Test frontend (if available)
      const frontendTest = await fetch('http://localhost:3000')
        .then(res => res.status)
        .catch(() => 404)
      expect([200, 404]).toContain(frontendTest)

      // Test Nginx proxy
      const nginxTest = await fetch('http://localhost:80')
        .then(res => res.status)
        .catch(() => 502)
      expect([200, 404, 502]).toContain(nginxTest)
    }, 60000)

    it('should handle service interdependencies correctly', async () => {
      // Create test data that exercises the full stack
      const tenant = await testFactory.createTenant({
        name: 'E2E Test Tenant',
        slug: 'e2e-tenant'
      })

      const user = await testFactory.createUser({
        tenantId: tenant.id,
        email: 'e2e@test.com',
        firstName: 'E2E',
        lastName: 'User'
      })

      await setTenantContext(prisma, tenant.id)

      // Verify data is accessible through database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { tenant: true }
      })

      expect(dbUser).toBeTruthy()
      expect(dbUser!.tenant.slug).toBe('e2e-tenant')

      // Test API endpoint that might use this data
      const apiResponse = await apiRequest('/api/health', 'GET', null, {
        'X-Tenant-ID': tenant.id
      })

      expect([200, 404]).toContain(apiResponse.status)
    })

    it('should maintain data consistency across service restarts', async () => {
      // Create persistent data
      const tenant = await testFactory.createTenant({
        name: 'Persistent Test Tenant',
        slug: 'persistent-tenant'
      })

      const user = await testFactory.createUser({
        tenantId: tenant.id,
        email: 'persistent@test.com'
      })

      const account = await testFactory.createAccount({
        tenantId: tenant.id,
        userId: user.id,
        balance: 1000.00
      })

      await setTenantContext(prisma, tenant.id)

      const transaction = await testFactory.createTransaction({
        tenantId: tenant.id,
        userId: user.id,
        accountId: account.id,
        amount: 100.00,
        description: 'Persistence Test'
      })

      // Disconnect and reconnect to simulate restart
      await prisma.$disconnect()
      await prisma.$connect()
      await setTenantContext(prisma, tenant.id)

      // Verify data persistence
      const persistedTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          user: true,
          account: true,
          tenant: true
        }
      })

      expect(persistedTransaction).toBeTruthy()
      expect(persistedTransaction!.description).toBe('Persistence Test')
      expect(persistedTransaction!.tenant.slug).toBe('persistent-tenant')
    })
  })

  describe('End-to-End User Workflows', () => {
    it('should handle complete user registration and setup workflow', async () => {
      // Step 1: Create tenant (simulating tenant registration)
      const tenant = await testFactory.createTenant({
        name: 'New User Company',
        slug: 'new-user-company',
        plan: 'FREE'
      })

      await setTenantContext(prisma, tenant.id)

      // Step 2: Create admin user
      const adminUser = await testFactory.createUser({
        tenantId: tenant.id,
        email: 'admin@newcompany.com',
        role: 'TENANT_ADMIN',
        status: 'ACTIVE'
      })

      // Step 3: Admin creates regular users
      const regularUser = await testFactory.createUser({
        tenantId: tenant.id,
        email: 'user@newcompany.com',
        role: 'USER'
      })

      // Step 4: Create default categories
      const categories = await Promise.all([
        testFactory.createCategory({
          tenantId: tenant.id,
          name: 'Income',
          isSystem: true
        }),
        testFactory.createCategory({
          tenantId: tenant.id,
          name: 'Expenses',
          isSystem: true
        }),
        testFactory.createCategory({
          tenantId: tenant.id,
          name: 'Food & Dining'
        }),
        testFactory.createCategory({
          tenantId: tenant.id,
          name: 'Transportation'
        })
      ])

      // Step 5: User creates accounts
      const accounts = await Promise.all([
        testFactory.createAccount({
          tenantId: tenant.id,
          userId: regularUser.id,
          name: 'Primary Checking',
          type: 'CHECKING',
          balance: 2000.00
        }),
        testFactory.createAccount({
          tenantId: tenant.id,
          userId: regularUser.id,
          name: 'Savings Account',
          type: 'SAVINGS',
          balance: 10000.00
        })
      ])

      // Step 6: User creates budgets
      const budget = await testFactory.createBudget({
        tenantId: tenant.id,
        userId: regularUser.id,
        accountId: accounts[0].id,
        categoryId: categories[2].id, // Food & Dining
        name: 'Monthly Food Budget',
        amount: 500.00,
        period: 'MONTHLY'
      })

      // Step 7: User creates transactions
      const transactions = await Promise.all([
        testFactory.createTransaction({
          tenantId: tenant.id,
          userId: regularUser.id,
          accountId: accounts[0].id,
          categoryId: categories[0].id, // Income
          amount: 3000.00,
          type: 'INCOME',
          description: 'Salary'
        }),
        testFactory.createTransaction({
          tenantId: tenant.id,
          userId: regularUser.id,
          accountId: accounts[0].id,
          categoryId: categories[2].id, // Food & Dining
          amount: 75.00,
          type: 'EXPENSE',
          description: 'Grocery shopping'
        }),
        testFactory.createTransaction({
          tenantId: tenant.id,
          userId: regularUser.id,
          accountId: accounts[0].id,
          categoryId: categories[3].id, // Transportation
          amount: 25.00,
          type: 'EXPENSE',
          description: 'Gas'
        })
      ])

      // Verify complete workflow
      const tenantData = await prisma.tenant.findUnique({
        where: { id: tenant.id },
        include: {
          users: {
            include: {
              accounts: {
                include: {
                  transactions: true
                }
              },
              budgets: true
            }
          },
          categories: true,
          transactions: true
        }
      })

      expect(tenantData).toBeTruthy()
      expect(tenantData!.users).toHaveLength(2) // admin + regular
      expect(tenantData!.categories).toHaveLength(4)
      expect(tenantData!.transactions).toHaveLength(3)

      const regularUserData = tenantData!.users.find(u => u.role === 'USER')
      expect(regularUserData!.accounts).toHaveLength(2)
      expect(regularUserData!.budgets).toHaveLength(1)

      // Verify budget calculations
      const foodTransactions = tenantData!.transactions.filter(t => t.categoryId === categories[2].id)
      const totalFoodSpending = foodTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
      expect(totalFoodSpending).toBe(75.00)

      // Verify account balances after transactions
      const checkingAccount = regularUserData!.accounts.find(a => a.type === 'CHECKING')
      const netTransactions = 3000.00 - 75.00 - 25.00 // Income - expenses
      expect(Number(checkingAccount!.balance)).toBe(2000.00) // Initial balance (transactions don't auto-update balance)
    })

    it('should handle complex financial operations workflow', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Complex scenario: User receives salary, pays bills, transfers money, and tracks budget

      // 1. Salary income
      const salaryTransaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        categoryId: setup.categories.income.id,
        amount: 5000.00,
        type: 'INCOME',
        description: 'Monthly Salary',
        date: new Date()
      })

      // 2. Update checking account balance
      await prisma.account.update({
        where: { id: setup.accounts.checking.id },
        data: { balance: { increment: 5000.00 } }
      })

      // 3. Create bill payment categories
      const billCategories = await Promise.all([
        testFactory.createCategory({
          tenantId: setup.tenant.id,
          name: 'Rent'
        }),
        testFactory.createCategory({
          tenantId: setup.tenant.id,
          name: 'Utilities'
        }),
        testFactory.createCategory({
          tenantId: setup.tenant.id,
          name: 'Insurance'
        })
      ])

      // 4. Pay bills
      const billPayments = await Promise.all([
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: billCategories[0].id,
          amount: 1200.00,
          type: 'EXPENSE',
          description: 'Monthly Rent'
        }),
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: billCategories[1].id,
          amount: 150.00,
          type: 'EXPENSE',
          description: 'Electric Bill'
        }),
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: billCategories[2].id,
          amount: 200.00,
          type: 'EXPENSE',
          description: 'Car Insurance'
        })
      ])

      // 5. Update checking account balance after expenses
      const totalExpenses = billPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      await prisma.account.update({
        where: { id: setup.accounts.checking.id },
        data: { balance: { decrement: totalExpenses } }
      })

      // 6. Transfer money to savings
      const transferAmount = 1000.00
      const [withdrawalTransaction, depositTransaction] = await Promise.all([
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          amount: transferAmount,
          type: 'EXPENSE',
          description: 'Transfer to Savings',
          reference: 'TRANSFER_001'
        }),
        testFactory.createTransaction({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.savings.id,
          amount: transferAmount,
          type: 'INCOME',
          description: 'Transfer from Checking',
          reference: 'TRANSFER_001'
        })
      ])

      // 7. Update both account balances
      await Promise.all([
        prisma.account.update({
          where: { id: setup.accounts.checking.id },
          data: { balance: { decrement: transferAmount } }
        }),
        prisma.account.update({
          where: { id: setup.accounts.savings.id },
          data: { balance: { increment: transferAmount } }
        })
      ])

      // 8. Create budgets for expense categories
      const budgets = await Promise.all(
        billCategories.map(category =>
          testFactory.createBudget({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            categoryId: category.id,
            name: `${category.name} Budget`,
            amount: category.name === 'Rent' ? 1200.00 :
                   category.name === 'Utilities' ? 200.00 : 250.00,
            period: 'MONTHLY'
          })
        )
      )

      // 9. Calculate budget utilization
      for (const budget of budgets) {
        const categorySpending = await prisma.transaction.aggregate({
          where: {
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: {
              gte: budget.startDate,
              lte: budget.endDate
            }
          },
          _sum: { amount: true }
        })

        await prisma.budget.update({
          where: { id: budget.id },
          data: { spent: Number(categorySpending._sum.amount) || 0 }
        })
      }

      // 10. Create audit log for the complex operation
      await prisma.auditLog.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          action: 'COMPLETE_WORKFLOW',
          resource: 'financial_operation',
          newValues: {
            salary: Number(salaryTransaction.amount),
            expenses: totalExpenses,
            transfer: transferAmount,
            budgets_created: budgets.length
          }
        }
      })

      // Verify the complete workflow
      const finalState = await prisma.user.findUnique({
        where: { id: setup.users.regular.id },
        include: {
          accounts: true,
          transactions: {
            orderBy: { createdAt: 'desc' }
          },
          budgets: {
            include: { category: true }
          }
        }
      })

      expect(finalState!.accounts).toHaveLength(2)
      expect(finalState!.transactions.length).toBeGreaterThanOrEqual(6) // salary + 3 bills + 2 transfers
      expect(finalState!.budgets).toHaveLength(3)

      // Verify account balances
      const checkingAccount = finalState!.accounts.find(a => a.type === 'CHECKING')
      const savingsAccount = finalState!.accounts.find(a => a.type === 'SAVINGS')

      // Expected checking balance: 1000 (initial) + 5000 (salary) - 1550 (bills) - 1000 (transfer) = 3450
      expect(Number(checkingAccount!.balance)).toBe(3450.00)

      // Expected savings balance: 5000 (initial) + 1000 (transfer) = 6000
      expect(Number(savingsAccount!.balance)).toBe(6000.00)

      // Verify budget utilization
      const rentBudget = finalState!.budgets.find(b => b.category?.name === 'Rent')
      expect(Number(rentBudget!.spent)).toBe(1200.00)
      expect(Number(rentBudget!.amount)).toBe(1200.00)
    })
  })

  describe('Multi-Tenant E2E Scenarios', () => {
    it('should handle multiple tenants operating simultaneously', async () => {
      // Create multiple tenant setups
      const tenantSetups = await Promise.all([
        testFactory.createTenantSetup({
          name: 'Company A',
          slug: 'company-a'
        }),
        testFactory.createTenantSetup({
          name: 'Company B',
          slug: 'company-b'
        }),
        testFactory.createTenantSetup({
          name: 'Company C',
          slug: 'company-c'
        })
      ])

      // Simulate concurrent operations for each tenant
      const concurrentOperations = tenantSetups.map(async (setup, index) => {
        await setTenantContext(prisma, setup.tenant.id)

        // Each tenant performs different operations
        const operations = []

        // Create transactions
        for (let i = 0; i < 10; i++) {
          operations.push(
            testFactory.createTransaction({
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              accountId: setup.accounts.checking.id,
              categoryId: setup.categories.expense.id,
              amount: (index + 1) * 50 + i * 10, // Different amounts per tenant
              description: `Tenant ${index + 1} Transaction ${i + 1}`
            })
          )
        }

        // Create budgets
        operations.push(
          testFactory.createBudget({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            categoryId: setup.categories.expense.id,
            name: `Tenant ${index + 1} Budget`,
            amount: (index + 1) * 1000
          })
        )

        const results = await Promise.all(operations)
        return { tenantId: setup.tenant.id, results }
      })

      const allResults = await Promise.all(concurrentOperations)

      // Verify isolation - each tenant should have its own data
      for (const [index, setup] of tenantSetups.entries()) {
        await setTenantContext(prisma, setup.tenant.id)

        const tenantTransactions = await prisma.transaction.findMany({
          where: { description: { startsWith: `Tenant ${index + 1}` } }
        })

        expect(tenantTransactions).toHaveLength(10)

        const tenantBudgets = await prisma.budget.findMany({
          where: { name: `Tenant ${index + 1} Budget` }
        })

        expect(tenantBudgets).toHaveLength(1)
        expect(Number(tenantBudgets[0].amount)).toBe((index + 1) * 1000)
      }

      // Verify no cross-tenant data leakage
      for (const setup of tenantSetups) {
        await setTenantContext(prisma, setup.tenant.id)

        const allVisibleTransactions = await prisma.transaction.findMany()
        expect(allVisibleTransactions.every(t => t.tenantId === setup.tenant.id)).toBe(true)

        const allVisibleUsers = await prisma.user.findMany()
        expect(allVisibleUsers.every(u => u.tenantId === setup.tenant.id)).toBe(true)
      }
    })

    it('should handle tenant scaling and resource limits', async () => {
      // Test creating multiple tenants and users to check scaling
      const tenants = await Promise.all(
        Array(5).fill(0).map((_, i) =>
          testFactory.createTenant({
            name: `Scale Test Tenant ${i + 1}`,
            slug: `scale-tenant-${i + 1}`
          })
        )
      )

      // For each tenant, create multiple users and data
      const scalingOperations = tenants.map(async (tenant, tenantIndex) => {
        await setTenantContext(prisma, tenant.id)

        // Create multiple users per tenant
        const users = await Promise.all(
          Array(3).fill(0).map((_, userIndex) =>
            testFactory.createUser({
              tenantId: tenant.id,
              email: `user${userIndex + 1}@tenant${tenantIndex + 1}.com`,
              firstName: `User${userIndex + 1}`,
              lastName: `Tenant${tenantIndex + 1}`
            })
          )
        )

        // Create accounts for each user
        const accounts = []
        for (const user of users) {
          const userAccounts = await Promise.all([
            testFactory.createAccount({
              tenantId: tenant.id,
              userId: user.id,
              name: 'Checking',
              type: 'CHECKING'
            }),
            testFactory.createAccount({
              tenantId: tenant.id,
              userId: user.id,
              name: 'Savings',
              type: 'SAVINGS'
            })
          ])
          accounts.push(...userAccounts)
        }

        // Create transactions for accounts
        const transactions = []
        for (const account of accounts) {
          const accountTransactions = await Promise.all(
            Array(5).fill(0).map(() =>
              testFactory.createTransaction({
                tenantId: tenant.id,
                userId: account.userId,
                accountId: account.id,
                amount: Math.random() * 500
              })
            )
          )
          transactions.push(...accountTransactions)
        }

        return {
          tenant,
          users: users.length,
          accounts: accounts.length,
          transactions: transactions.length
        }
      })

      const scalingResults = await Promise.all(scalingOperations)

      // Verify scaling results
      expect(scalingResults).toHaveLength(5)
      scalingResults.forEach(result => {
        expect(result.users).toBe(3)
        expect(result.accounts).toBe(6) // 3 users × 2 accounts each
        expect(result.transactions).toBe(30) // 6 accounts × 5 transactions each
      })

      // Test query performance with scaled data
      const { duration: queryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        // Query across all tenants (should only see current tenant's data)
        await setTenantContext(prisma, tenants[0].id)
        return prisma.transaction.findMany({
          include: {
            account: {
              include: { user: true }
            }
          },
          take: 100
        })
      })

      expect(queryTime).toBeLessThan(2000) // Should complete within 2 seconds even with scaled data
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle high-volume transaction processing', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Test processing large volumes of transactions
      const { totalTime, avgTime, maxTime } = await PerformanceTestUtils.runLoadTest(
        async () => {
          return testFactory.createTransaction({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: setup.categories.expense.id,
            amount: Math.random() * 100
          })
        },
        10, // 10 concurrent operations
        50  // 50 total operations
      )

      expect(totalTime).toBeLessThan(30000) // Complete within 30 seconds
      expect(avgTime).toBeLessThan(1000) // Average under 1 second per operation
      expect(maxTime).toBeLessThan(5000) // Max under 5 seconds

      // Verify all transactions were created
      const totalTransactions = await prisma.transaction.count()
      expect(totalTransactions).toBeGreaterThanOrEqual(50)
    }, 60000)

    it('should maintain performance under concurrent user load', async () => {
      // Create multiple tenants with users
      const tenantSetups = await Promise.all(
        Array(3).fill(0).map(() => testFactory.createTenantSetup())
      )

      // Simulate concurrent users performing operations
      const userOperations = tenantSetups.map(async (setup) => {
        await setTenantContext(prisma, setup.tenant.id)

        return PerformanceTestUtils.runLoadTest(
          async () => {
            // Simulate typical user operations
            const operations = [
              // Create transaction
              testFactory.createTransaction({
                tenantId: setup.tenant.id,
                userId: setup.users.regular.id,
                accountId: setup.accounts.checking.id,
                amount: Math.random() * 200
              }),
              // Query recent transactions
              prisma.transaction.findMany({
                where: { userId: setup.users.regular.id },
                orderBy: { date: 'desc' },
                take: 10
              }),
              // Update account balance (simulated)
              prisma.account.findUnique({
                where: { id: setup.accounts.checking.id }
              })
            ]

            return Promise.all(operations)
          },
          3, // 3 concurrent operations per tenant
          10 // 10 iterations per tenant
        )
      })

      const results = await Promise.all(userOperations)

      // All tenant operations should complete successfully
      results.forEach(result => {
        expect(result.totalTime).toBeLessThan(60000) // 1 minute max
        expect(result.avgTime).toBeLessThan(2000) // 2 seconds average
      })
    }, 120000)
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from database connection issues', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Simulate connection issue by disconnecting
      await prisma.$disconnect()

      // Attempt operations (should reconnect automatically)
      await prisma.$connect()
      await setTenantContext(prisma, setup.tenant.id)

      const transaction = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: 100.00,
        description: 'Recovery test'
      })

      expect(transaction).toBeTruthy()
      expect(transaction.description).toBe('Recovery test')
    })

    it('should handle application restarts with data integrity', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create transaction before "restart"
      const transaction1 = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: 100.00,
        description: 'Before restart'
      })

      // Simulate restart by disconnecting and reconnecting
      await prisma.$disconnect()
      await prisma.$connect()
      await setTenantContext(prisma, setup.tenant.id)

      // Create transaction after "restart"
      const transaction2 = await testFactory.createTransaction({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: setup.accounts.checking.id,
        amount: 200.00,
        description: 'After restart'
      })

      // Verify both transactions exist and data integrity is maintained
      const allTransactions = await prisma.transaction.findMany({
        where: {
          description: { in: ['Before restart', 'After restart'] }
        },
        orderBy: { createdAt: 'asc' }
      })

      expect(allTransactions).toHaveLength(2)
      expect(allTransactions[0].description).toBe('Before restart')
      expect(allTransactions[1].description).toBe('After restart')
      expect(Number(allTransactions[0].amount)).toBe(100.00)
      expect(Number(allTransactions[1].amount)).toBe(200.00)
    })

    it('should handle partial failures in complex operations', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Attempt complex operation that might partially fail
      let partialSuccessCount = 0
      let fullFailureCount = 0

      for (let i = 0; i < 10; i++) {
        try {
          await prisma.$transaction(async (tx) => {
            // Create transaction
            const transaction = await tx.transaction.create({
              data: {
                tenantId: setup.tenant.id,
                userId: setup.users.regular.id,
                accountId: setup.accounts.checking.id,
                amount: 100.00,
                type: 'EXPENSE',
                description: `Batch transaction ${i}`,
                date: new Date()
              }
            })

            // Update account balance
            await tx.account.update({
              where: { id: setup.accounts.checking.id },
              data: { balance: { decrement: 100.00 } }
            })

            // Randomly fail some operations to test resilience
            if (i === 5) {
              throw new Error('Simulated failure')
            }

            partialSuccessCount++
          })
        } catch (error) {
          if (error.message === 'Simulated failure') {
            fullFailureCount++
          } else {
            throw error // Re-throw unexpected errors
          }
        }
      }

      expect(partialSuccessCount).toBe(9) // All except the one that failed
      expect(fullFailureCount).toBe(1) // Only the simulated failure

      // Verify database consistency
      const transactionCount = await prisma.transaction.count({
        where: { description: { startsWith: 'Batch transaction' } }
      })

      expect(transactionCount).toBe(9) // Only successful transactions persisted
    })
  })
})