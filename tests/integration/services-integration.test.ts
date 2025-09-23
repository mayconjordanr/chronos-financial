import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, PerformanceTestUtils } from '../utils/test-utilities'

describe('Services Integration Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('User Service Integration', () => {
    it('should create user with proper tenant context', async () => {
      const tenant = await testFactory.createTenant()
      await setTenantContext(prisma, tenant.id)

      const userData = {
        tenantId: tenant.id,
        email: 'integration@test.com',
        username: 'integrationuser',
        firstName: 'Integration',
        lastName: 'Test',
        password: 'hashedpassword',
        role: 'USER' as const
      }

      const user = await prisma.user.create({ data: userData })

      expect(user.tenantId).toBe(tenant.id)
      expect(user.email).toBe(userData.email)

      // Verify user is visible in tenant context
      const foundUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(foundUser).toBeTruthy()

      // Verify user is not visible in different tenant context
      const otherTenant = await testFactory.createTenant()
      await setTenantContext(prisma, otherTenant.id)

      const notFoundUser = await prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(notFoundUser).toBeNull()
    })

    it('should handle user authentication flow', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({
        tenantId: tenant.id,
        email: 'auth@test.com',
        password: 'TestPassword123!'
      })

      await setTenantContext(prisma, tenant.id)

      // Simulate login - find user by email
      const loginUser = await prisma.user.findFirst({
        where: {
          email: 'auth@test.com',
          status: 'ACTIVE'
        },
        include: {
          tenant: true
        }
      })

      expect(loginUser).toBeTruthy()
      expect(loginUser!.tenant.id).toBe(tenant.id)

      // Update last login
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      expect(updatedUser.lastLoginAt).toBeTruthy()
    })

    it('should manage user sessions with tenant isolation', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({ tenantId: tenant1.id })
      const user2 = await testFactory.createUser({ tenantId: tenant2.id })

      // Create sessions for users in different tenants
      const session1 = await prisma.session.create({
        data: {
          userId: user1.id,
          token: 'token1',
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        }
      })

      const session2 = await prisma.session.create({
        data: {
          userId: user2.id,
          token: 'token2',
          expiresAt: new Date(Date.now() + 3600000)
        }
      })

      // Verify session isolation
      await setTenantContext(prisma, tenant1.id)
      const tenant1Sessions = await prisma.session.findMany({
        include: { user: true }
      })

      expect(tenant1Sessions).toHaveLength(1)
      expect(tenant1Sessions[0].user.tenantId).toBe(tenant1.id)

      await setTenantContext(prisma, tenant2.id)
      const tenant2Sessions = await prisma.session.findMany({
        include: { user: true }
      })

      expect(tenant2Sessions).toHaveLength(1)
      expect(tenant2Sessions[0].user.tenantId).toBe(tenant2.id)
    })
  })

  describe('Account Service Integration', () => {
    it('should create and manage accounts with proper balance tracking', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const account = await prisma.account.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          name: 'Integration Test Account',
          type: 'CHECKING',
          balance: 1000.00,
          currency: 'USD'
        }
      })

      expect(account.balance.toString()).toBe('1000.00')

      // Update balance
      const updatedAccount = await prisma.account.update({
        where: { id: account.id },
        data: { balance: 1500.00 }
      })

      expect(updatedAccount.balance.toString()).toBe('1500.00')

      // Verify account is tied to correct user and tenant
      const accountWithRelations = await prisma.account.findUnique({
        where: { id: account.id },
        include: {
          user: true,
          tenant: true
        }
      })

      expect(accountWithRelations!.user.id).toBe(setup.users.regular.id)
      expect(accountWithRelations!.tenant.id).toBe(setup.tenant.id)
    })

    it('should handle multiple accounts per user', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const accounts = await Promise.all([
        prisma.account.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            name: 'Checking Account',
            type: 'CHECKING',
            balance: 1000.00
          }
        }),
        prisma.account.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            name: 'Savings Account',
            type: 'SAVINGS',
            balance: 5000.00
          }
        }),
        prisma.account.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            name: 'Credit Card',
            type: 'CREDIT_CARD',
            balance: -500.00
          }
        })
      ])

      const userAccounts = await prisma.account.findMany({
        where: { userId: setup.users.regular.id },
        orderBy: { name: 'asc' }
      })

      expect(userAccounts).toHaveLength(5) // 2 from setup + 3 new
      expect(userAccounts.map(a => a.type)).toContain('CHECKING')
      expect(userAccounts.map(a => a.type)).toContain('SAVINGS')
      expect(userAccounts.map(a => a.type)).toContain('CREDIT_CARD')

      // Calculate total balance
      const totalBalance = userAccounts.reduce(
        (sum, account) => sum + Number(account.balance),
        0
      )
      expect(totalBalance).toBe(11500.00) // 1000 + 5000 + 1000 + 5000 - 500
    })
  })

  describe('Transaction Service Integration', () => {
    it('should create transactions with proper categorization', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const transaction = await prisma.transaction.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: setup.categories.expense.id,
          amount: 50.00,
          type: 'EXPENSE',
          description: 'Grocery shopping',
          date: new Date(),
          status: 'COMPLETED'
        }
      })

      const transactionWithRelations = await prisma.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          account: true,
          category: true,
          user: true
        }
      })

      expect(transactionWithRelations).toBeTruthy()
      expect(transactionWithRelations!.account.name).toBeTruthy()
      expect(transactionWithRelations!.category!.name).toBeTruthy()
      expect(transactionWithRelations!.user.email).toBeTruthy()
      expect(transactionWithRelations!.amount.toString()).toBe('50.00')
    })

    it('should handle transaction aggregations and reporting', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create multiple transactions
      const transactions = await Promise.all([
        prisma.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: setup.categories.expense.id,
            amount: 100.00,
            type: 'EXPENSE',
            description: 'Expense 1',
            date: new Date()
          }
        }),
        prisma.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: setup.categories.income.id,
            amount: 500.00,
            type: 'INCOME',
            description: 'Income 1',
            date: new Date()
          }
        }),
        prisma.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.savings.id,
            categoryId: setup.categories.expense.id,
            amount: 75.00,
            type: 'EXPENSE',
            description: 'Expense 2',
            date: new Date()
          }
        })
      ])

      // Test aggregations
      const totalExpenses = await prisma.transaction.aggregate({
        where: { type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true
      })

      expect(totalExpenses._count).toBe(2)
      expect(Number(totalExpenses._sum.amount)).toBe(175.00)

      const totalIncome = await prisma.transaction.aggregate({
        where: { type: 'INCOME' },
        _sum: { amount: true }
      })

      expect(Number(totalIncome._sum.amount)).toBe(500.00)

      // Test grouping by category
      const categoryTotals = await prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        _count: true
      })

      expect(categoryTotals).toHaveLength(2) // expense and income categories
    })

    it('should handle transaction transfers between accounts', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const initialCheckingBalance = Number(setup.accounts.checking.balance)
      const initialSavingsBalance = Number(setup.accounts.savings.balance)

      // Create transfer transactions
      const transferAmount = 200.00

      const [withdrawTransaction, depositTransaction] = await Promise.all([
        prisma.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            amount: transferAmount,
            type: 'EXPENSE',
            description: 'Transfer to savings',
            date: new Date(),
            reference: 'TRANSFER_001'
          }
        }),
        prisma.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.savings.id,
            amount: transferAmount,
            type: 'INCOME',
            description: 'Transfer from checking',
            date: new Date(),
            reference: 'TRANSFER_001'
          }
        })
      ])

      // Update account balances
      await Promise.all([
        prisma.account.update({
          where: { id: setup.accounts.checking.id },
          data: { balance: initialCheckingBalance - transferAmount }
        }),
        prisma.account.update({
          where: { id: setup.accounts.savings.id },
          data: { balance: initialSavingsBalance + transferAmount }
        })
      ])

      // Verify the transfer
      const updatedAccounts = await prisma.account.findMany({
        where: {
          id: { in: [setup.accounts.checking.id, setup.accounts.savings.id] }
        }
      })

      const checkingAccount = updatedAccounts.find(a => a.id === setup.accounts.checking.id)
      const savingsAccount = updatedAccounts.find(a => a.id === setup.accounts.savings.id)

      expect(Number(checkingAccount!.balance)).toBe(initialCheckingBalance - transferAmount)
      expect(Number(savingsAccount!.balance)).toBe(initialSavingsBalance + transferAmount)

      // Verify both transactions have the same reference
      expect(withdrawTransaction.reference).toBe(depositTransaction.reference)
    })
  })

  describe('Budget Service Integration', () => {
    it('should create and track budget spending', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const budget = await prisma.budget.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: setup.categories.expense.id,
          name: 'Monthly Grocery Budget',
          amount: 500.00,
          period: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })

      // Create some transactions in the budget category
      await Promise.all([
        prisma.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: setup.categories.expense.id,
            amount: 150.00,
            type: 'EXPENSE',
            description: 'Grocery Store',
            date: new Date()
          }
        }),
        prisma.transaction.create({
          data: {
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            accountId: setup.accounts.checking.id,
            categoryId: setup.categories.expense.id,
            amount: 80.00,
            type: 'EXPENSE',
            description: 'Supermarket',
            date: new Date()
          }
        })
      ])

      // Calculate budget spending
      const budgetSpending = await prisma.transaction.aggregate({
        where: {
          categoryId: setup.categories.expense.id,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate
          }
        },
        _sum: { amount: true }
      })

      const totalSpent = Number(budgetSpending._sum.amount) || 0

      // Update budget with spent amount
      const updatedBudget = await prisma.budget.update({
        where: { id: budget.id },
        data: { spent: totalSpent }
      })

      expect(Number(updatedBudget.spent)).toBe(230.00)
      expect(Number(updatedBudget.amount)).toBe(500.00)

      // Calculate budget utilization
      const utilization = (Number(updatedBudget.spent) / Number(updatedBudget.amount)) * 100
      expect(utilization).toBe(46.00) // 230/500 * 100
    })

    it('should handle budget alerts and thresholds', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const budget = await prisma.budget.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          categoryId: setup.categories.expense.id,
          name: 'Alert Test Budget',
          amount: 100.00,
          alertThreshold: 80.00, // 80% threshold
          period: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      })

      // Spend close to threshold
      await prisma.transaction.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: setup.categories.expense.id,
          amount: 85.00,
          type: 'EXPENSE',
          description: 'Large purchase',
          date: new Date()
        }
      })

      // Update budget spent amount
      const updatedBudget = await prisma.budget.update({
        where: { id: budget.id },
        data: { spent: 85.00 }
      })

      // Check if alert should be triggered
      const spentPercentage = (Number(updatedBudget.spent) / Number(updatedBudget.amount)) * 100
      const shouldAlert = spentPercentage >= Number(updatedBudget.alertThreshold!)

      expect(shouldAlert).toBe(true)
      expect(spentPercentage).toBe(85.00)
    })
  })

  describe('Multi-Service Integration Workflows', () => {
    it('should handle complete financial transaction workflow', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // 1. Create a budget for entertainment
      const entertainmentCategory = await prisma.category.create({
        data: {
          tenantId: setup.tenant.id,
          name: 'Entertainment',
          description: 'Entertainment expenses'
        }
      })

      const budget = await prisma.budget.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          categoryId: entertainmentCategory.id,
          name: 'Entertainment Budget',
          amount: 300.00,
          period: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          alertThreshold: 75.00
        }
      })

      // 2. Create a transaction
      const transaction = await prisma.transaction.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: entertainmentCategory.id,
          amount: 45.00,
          type: 'EXPENSE',
          description: 'Movie tickets',
          date: new Date()
        }
      })

      // 3. Update account balance
      const currentBalance = Number(setup.accounts.checking.balance)
      const updatedAccount = await prisma.account.update({
        where: { id: setup.accounts.checking.id },
        data: { balance: currentBalance - 45.00 }
      })

      // 4. Update budget spent amount
      const budgetSpending = await prisma.transaction.aggregate({
        where: {
          categoryId: entertainmentCategory.id,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate
          }
        },
        _sum: { amount: true }
      })

      const updatedBudget = await prisma.budget.update({
        where: { id: budget.id },
        data: { spent: Number(budgetSpending._sum.amount) || 0 }
      })

      // 5. Create audit log
      const auditLog = await prisma.auditLog.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          action: 'CREATE',
          resource: 'transaction',
          resourceId: transaction.id,
          newValues: {
            amount: transaction.amount,
            description: transaction.description,
            category: entertainmentCategory.name
          }
        }
      })

      // Verify the complete workflow
      expect(Number(updatedAccount.balance)).toBe(currentBalance - 45.00)
      expect(Number(updatedBudget.spent)).toBe(45.00)
      expect(auditLog.action).toBe('CREATE')
      expect(auditLog.resource).toBe('transaction')

      // Verify all data is properly isolated to tenant
      const allData = await prisma.transaction.findMany({
        include: {
          account: true,
          category: true,
          user: true
        }
      })

      expect(allData.every(item => item.tenantId === setup.tenant.id)).toBe(true)
    })

    it('should handle performance under load', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create multiple categories
      const categories = await Promise.all(
        Array(5).fill(0).map((_, i) =>
          prisma.category.create({
            data: {
              tenantId: setup.tenant.id,
              name: `Category ${i + 1}`,
              description: `Test category ${i + 1}`
            }
          })
        )
      )

      // Create multiple transactions concurrently
      const { totalTime, avgTime } = await PerformanceTestUtils.runLoadTest(
        async () => {
          return prisma.transaction.create({
            data: {
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              accountId: setup.accounts.checking.id,
              categoryId: categories[Math.floor(Math.random() * categories.length)].id,
              amount: Math.random() * 100,
              type: Math.random() > 0.5 ? 'INCOME' : 'EXPENSE',
              description: `Load test transaction`,
              date: new Date()
            }
          })
        },
        5, // 5 concurrent operations
        20  // 20 iterations
      )

      expect(totalTime).toBeLessThan(10000) // Should complete in less than 10 seconds
      expect(avgTime).toBeLessThan(500) // Average operation should be under 500ms

      // Verify all transactions were created
      const transactionCount = await prisma.transaction.count()
      expect(transactionCount).toBeGreaterThanOrEqual(20)
    })
  })

  describe('Error Handling and Data Integrity', () => {
    it('should maintain data consistency during failed transactions', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      const initialBalance = Number(setup.accounts.checking.balance)

      // Attempt to create an invalid transaction that should fail
      await expect(
        prisma.$transaction(async (tx) => {
          // Create transaction
          await tx.transaction.create({
            data: {
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              accountId: setup.accounts.checking.id,
              amount: 100.00,
              type: 'EXPENSE',
              description: 'Test transaction',
              date: new Date()
            }
          })

          // Update account balance
          await tx.account.update({
            where: { id: setup.accounts.checking.id },
            data: { balance: initialBalance - 100.00 }
          })

          // Force failure
          throw new Error('Transaction failed')
        })
      ).rejects.toThrow('Transaction failed')

      // Verify rollback occurred
      const account = await prisma.account.findUnique({
        where: { id: setup.accounts.checking.id }
      })

      expect(Number(account!.balance)).toBe(initialBalance)

      const transactions = await prisma.transaction.findMany({
        where: { description: 'Test transaction' }
      })

      expect(transactions).toHaveLength(0)
    })

    it('should handle constraint violations gracefully', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Try to create duplicate category name (should fail due to unique constraint)
      await expect(
        prisma.category.create({
          data: {
            tenantId: setup.tenant.id,
            name: setup.categories.expense.name, // Duplicate name
            description: 'Duplicate category'
          }
        })
      ).rejects.toThrow()

      // Verify original category is unchanged
      const originalCategory = await prisma.category.findUnique({
        where: { id: setup.categories.expense.id }
      })

      expect(originalCategory).toBeTruthy()
      expect(originalCategory!.description).not.toBe('Duplicate category')
    })
  })
})