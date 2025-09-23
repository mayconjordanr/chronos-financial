import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, PerformanceTestUtils } from '../utils/test-utilities'

describe('E2E Performance and Load Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('Database Performance Under Load', () => {
    it('should handle large-scale multi-tenant operations efficiently', async () => {
      // Create multiple tenants with substantial data
      const tenantCount = 5
      const usersPerTenant = 10
      const accountsPerUser = 3
      const transactionsPerAccount = 100

      const tenantsData = []

      // Setup phase - create tenants and users
      for (let t = 0; t < tenantCount; t++) {
        const tenant = await testFactory.createTenant({
          name: `Performance Tenant ${t + 1}`,
          slug: `perf-tenant-${t + 1}`,
          plan: t % 2 === 0 ? 'PREMIUM' : 'BASIC'
        })

        await setTenantContext(prisma, tenant.id)

        const users = []
        for (let u = 0; u < usersPerTenant; u++) {
          const user = await testFactory.createUser({
            tenantId: tenant.id,
            email: `user${u + 1}@tenant${t + 1}.com`,
            firstName: `User${u + 1}`,
            lastName: `Tenant${t + 1}`
          })
          users.push(user)
        }

        const categories = await Promise.all([
          testFactory.createCategory({
            tenantId: tenant.id,
            name: 'Income'
          }),
          testFactory.createCategory({
            tenantId: tenant.id,
            name: 'Expenses'
          }),
          testFactory.createCategory({
            tenantId: tenant.id,
            name: 'Food & Dining'
          }),
          testFactory.createCategory({
            tenantId: tenant.id,
            name: 'Transportation'
          }),
          testFactory.createCategory({
            tenantId: tenant.id,
            name: 'Entertainment'
          })
        ])

        tenantsData.push({ tenant, users, categories })
      }

      // Data creation phase - measure bulk operations performance
      const { totalTime: dataCreationTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        for (const { tenant, users, categories } of tenantsData) {
          await setTenantContext(prisma, tenant.id)

          // Create accounts for all users
          const accounts = []
          for (const user of users) {
            for (let a = 0; a < accountsPerUser; a++) {
              const account = await testFactory.createAccount({
                tenantId: tenant.id,
                userId: user.id,
                name: `Account ${a + 1}`,
                type: a === 0 ? 'CHECKING' : a === 1 ? 'SAVINGS' : 'CREDIT_CARD',
                balance: Math.random() * 10000
              })
              accounts.push(account)
            }
          }

          // Bulk create transactions
          const transactionData = []
          for (const account of accounts) {
            for (let i = 0; i < transactionsPerAccount; i++) {
              transactionData.push({
                tenantId: tenant.id,
                userId: account.userId,
                accountId: account.id,
                categoryId: categories[Math.floor(Math.random() * categories.length)].id,
                amount: Math.random() * 1000,
                type: Math.random() > 0.6 ? 'INCOME' : 'EXPENSE' as const,
                description: `Transaction ${i + 1} for ${account.name}`,
                date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date within last year
              })
            }
          }

          // Bulk insert transactions for this tenant
          await prisma.transaction.createMany({
            data: transactionData
          })
        }
      })

      console.log(`Data creation completed in ${dataCreationTime}ms`)
      expect(dataCreationTime).toBeLessThan(120000) // Should complete within 2 minutes

      // Query performance testing phase
      const queryTests = []

      for (const { tenant } of tenantsData) {
        await setTenantContext(prisma, tenant.id)

        // Test 1: Complex aggregation query
        queryTests.push(
          PerformanceTestUtils.measureQueryTime(async () => {
            return prisma.transaction.groupBy({
              by: ['type', 'categoryId'],
              _sum: { amount: true },
              _count: true,
              _avg: { amount: true },
              where: {
                date: {
                  gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
                }
              }
            })
          })
        )

        // Test 2: Complex join query
        queryTests.push(
          PerformanceTestUtils.measureQueryTime(async () => {
            return prisma.user.findMany({
              include: {
                accounts: {
                  include: {
                    transactions: {
                      where: {
                        date: {
                          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                        }
                      },
                      orderBy: { date: 'desc' },
                      take: 10
                    }
                  }
                },
                budgets: true
              }
            })
          })
        )

        // Test 3: Search and filter query
        queryTests.push(
          PerformanceTestUtils.measureQueryTime(async () => {
            return prisma.transaction.findMany({
              where: {
                AND: [
                  { amount: { gte: 100 } },
                  { type: 'EXPENSE' },
                  {
                    OR: [
                      { description: { contains: 'food', mode: 'insensitive' } },
                      { description: { contains: 'restaurant', mode: 'insensitive' } },
                      { description: { contains: 'grocery', mode: 'insensitive' } }
                    ]
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
              ],
              take: 50
            })
          })
        )
      }

      const queryResults = await Promise.all(queryTests)

      // Analyze query performance
      const avgQueryTime = queryResults.reduce((sum, result) => sum + result.duration, 0) / queryResults.length
      const maxQueryTime = Math.max(...queryResults.map(result => result.duration))

      console.log(`Average query time: ${avgQueryTime}ms`)
      console.log(`Max query time: ${maxQueryTime}ms`)

      expect(avgQueryTime).toBeLessThan(2000) // Average under 2 seconds
      expect(maxQueryTime).toBeLessThan(5000) // Max under 5 seconds

      // Verify data integrity and isolation
      for (const { tenant } of tenantsData) {
        await setTenantContext(prisma, tenant.id)

        const tenantStats = await prisma.transaction.aggregate({
          _count: true,
          _sum: { amount: true }
        })

        expect(tenantStats._count).toBe(usersPerTenant * accountsPerUser * transactionsPerAccount)
      }
    }, 300000) // 5 minute timeout

    it('should maintain performance with concurrent tenant operations', async () => {
      // Create multiple tenants for concurrent testing
      const concurrentTenants = await Promise.all(
        Array(3).fill(0).map((_, i) =>
          testFactory.createTenantSetup({
            name: `Concurrent Perf Tenant ${i + 1}`,
            slug: `concurrent-perf-${i + 1}`
          })
        )
      )

      // Run concurrent operations across tenants
      const concurrentTests = concurrentTenants.map(async (setup, index) => {
        await setTenantContext(prisma, setup.tenant.id)

        return PerformanceTestUtils.runLoadTest(
          async () => {
            // Simulate typical application workflow

            // 1. Create transaction
            const transaction = await testFactory.createTransaction({
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              accountId: setup.accounts.checking.id,
              categoryId: setup.categories.expense.id,
              amount: Math.random() * 500
            })

            // 2. Query recent transactions
            const recentTransactions = await prisma.transaction.findMany({
              where: { accountId: setup.accounts.checking.id },
              orderBy: { date: 'desc' },
              take: 10,
              include: { category: true }
            })

            // 3. Calculate account balance (simulation)
            const balanceCheck = await prisma.transaction.aggregate({
              where: { accountId: setup.accounts.checking.id },
              _sum: { amount: true }
            })

            // 4. Check budgets
            const budgets = await prisma.budget.findMany({
              where: { userId: setup.users.regular.id },
              include: { category: true }
            })

            return {
              transactionId: transaction.id,
              recentCount: recentTransactions.length,
              totalAmount: balanceCheck._sum.amount,
              budgetCount: budgets.length
            }
          },
          5, // 5 concurrent operations per tenant
          20 // 20 iterations per tenant
        )
      })

      const concurrentResults = await Promise.all(concurrentTests)

      // Analyze concurrent performance
      concurrentResults.forEach((result, index) => {
        console.log(`Tenant ${index + 1} - Total time: ${result.totalTime}ms, Avg: ${result.avgTime}ms`)

        expect(result.totalTime).toBeLessThan(60000) // Under 1 minute total
        expect(result.avgTime).toBeLessThan(3000) // Under 3 seconds average
        expect(result.maxTime).toBeLessThan(10000) // Under 10 seconds max
        expect(result.results).toHaveLength(20)
      })

      // Verify data isolation was maintained during concurrent operations
      for (const [index, setup] of concurrentTenants.entries()) {
        await setTenantContext(prisma, setup.tenant.id)

        const tenantTransactions = await prisma.transaction.findMany()
        expect(tenantTransactions.every(t => t.tenantId === setup.tenant.id)).toBe(true)
      }
    }, 180000) // 3 minute timeout
  })

  describe('Memory and Resource Usage', () => {
    it('should handle large result sets efficiently', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create a large dataset
      const largeDatasetSize = 5000
      const transactionData = Array(largeDatasetSize).fill(0).map((_, i) => ({
        tenantId: setup.tenant.id,
        userId: setup.users.regular.id,
        accountId: i % 2 === 0 ? setup.accounts.checking.id : setup.accounts.savings.id,
        categoryId: i % 2 === 0 ? setup.categories.expense.id : setup.categories.income.id,
        amount: 10 + (i % 1000),
        type: i % 3 === 0 ? 'INCOME' : 'EXPENSE' as const,
        description: `Large dataset transaction ${i + 1}`,
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      }))

      // Bulk insert
      const { duration: insertTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        await prisma.transaction.createMany({
          data: transactionData
        })
      })

      expect(insertTime).toBeLessThan(30000) // Insert should complete within 30 seconds

      // Test pagination performance
      const pageSize = 100
      const totalPages = Math.ceil(largeDatasetSize / pageSize)

      const paginationTests = []

      for (let page = 0; page < Math.min(totalPages, 10); page++) {
        paginationTests.push(
          PerformanceTestUtils.measureQueryTime(async () => {
            return prisma.transaction.findMany({
              orderBy: { date: 'desc' },
              skip: page * pageSize,
              take: pageSize,
              include: {
                account: true,
                category: true
              }
            })
          })
        )
      }

      const paginationResults = await Promise.all(paginationTests)

      paginationResults.forEach((result, page) => {
        expect(result.duration).toBeLessThan(2000) // Each page should load within 2 seconds
        expect(result.result).toHaveLength(pageSize)
      })

      // Test aggregation performance on large dataset
      const { duration: aggregationTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.groupBy({
          by: ['type', 'accountId'],
          _sum: { amount: true },
          _count: true,
          _avg: { amount: true },
          _min: { amount: true },
          _max: { amount: true }
        })
      })

      expect(aggregationTime).toBeLessThan(5000) // Aggregation should complete within 5 seconds

      // Test search performance on large dataset
      const { duration: searchTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          where: {
            OR: [
              { description: { contains: '100', mode: 'insensitive' } },
              { description: { contains: '200', mode: 'insensitive' } },
              { description: { contains: '300', mode: 'insensitive' } }
            ]
          },
          orderBy: { date: 'desc' },
          take: 50
        })
      })

      expect(searchTime).toBeLessThan(3000) // Search should complete within 3 seconds
    }, 120000)

    it('should handle connection pooling under stress', async () => {
      // Create multiple tenants for connection stress testing
      const tenants = await Promise.all(
        Array(5).fill(0).map((_, i) =>
          testFactory.createTenantSetup({ slug: `stress-tenant-${i + 1}` })
        )
      )

      // Create many concurrent database operations
      const connectionStressTests = []

      for (let i = 0; i < 50; i++) {
        const tenant = tenants[i % tenants.length]

        connectionStressTests.push(
          (async () => {
            await setTenantContext(prisma, tenant.tenant.id)

            // Perform a database operation
            const transaction = await testFactory.createTransaction({
              tenantId: tenant.tenant.id,
              userId: tenant.users.regular.id,
              accountId: tenant.accounts.checking.id,
              amount: Math.random() * 100,
              description: `Stress test transaction ${i + 1}`
            })

            // Perform a query
            const recentTransactions = await prisma.transaction.findMany({
              where: { userId: tenant.users.regular.id },
              orderBy: { date: 'desc' },
              take: 5
            })

            return {
              transactionId: transaction.id,
              queryResults: recentTransactions.length,
              tenantId: tenant.tenant.id
            }
          })()
        )
      }

      const { duration: stressTestTime, results: stressResults } = await PerformanceTestUtils.measureQueryTime(async () => {
        return Promise.all(connectionStressTests)
      })

      expect(stressTestTime).toBeLessThan(60000) // All operations should complete within 1 minute
      expect(stressResults).toHaveLength(50)

      // Verify all operations completed successfully
      stressResults.forEach(result => {
        expect(result.transactionId).toBeTruthy()
        expect(typeof result.queryResults).toBe('number')
        expect(result.tenantId).toBeTruthy()
      })

      // Verify data isolation was maintained under stress
      for (const tenant of tenants) {
        await setTenantContext(prisma, tenant.tenant.id)

        const tenantTransactions = await prisma.transaction.findMany({
          where: { description: { startsWith: 'Stress test transaction' } }
        })

        expect(tenantTransactions.every(t => t.tenantId === tenant.tenant.id)).toBe(true)
      }
    }, 120000)
  })

  describe('Scalability and Limits', () => {
    it('should handle tenant scaling scenarios', async () => {
      // Test creating many tenants and measuring performance degradation
      const initialTenantCount = 10
      const usersPerTenant = 5
      const transactionsPerUser = 50

      const scalingResults = []

      for (let batch = 0; batch < 3; batch++) {
        const batchStartTime = Date.now()

        // Create tenants for this batch
        const batchTenants = []
        for (let t = 0; t < initialTenantCount; t++) {
          const tenant = await testFactory.createTenant({
            name: `Scaling Tenant B${batch + 1}T${t + 1}`,
            slug: `scaling-b${batch + 1}-t${t + 1}`
          })
          batchTenants.push(tenant)
        }

        // Create users and data for each tenant
        for (const tenant of batchTenants) {
          await setTenantContext(prisma, tenant.id)

          const users = await Promise.all(
            Array(usersPerTenant).fill(0).map((_, u) =>
              testFactory.createUser({
                tenantId: tenant.id,
                email: `user${u + 1}@${tenant.slug}.com`
              })
            )
          )

          const category = await testFactory.createCategory({
            tenantId: tenant.id,
            name: 'Scaling Test Category'
          })

          for (const user of users) {
            const account = await testFactory.createAccount({
              tenantId: tenant.id,
              userId: user.id
            })

            const transactionData = Array(transactionsPerUser).fill(0).map((_, i) => ({
              tenantId: tenant.id,
              userId: user.id,
              accountId: account.id,
              categoryId: category.id,
              amount: Math.random() * 200,
              type: 'EXPENSE' as const,
              description: `Scaling transaction ${i + 1}`,
              date: new Date()
            }))

            await prisma.transaction.createMany({
              data: transactionData
            })
          }
        }

        const batchEndTime = Date.now()
        const batchDuration = batchEndTime - batchStartTime

        // Test query performance for this batch size
        const queryTestStart = Date.now()

        const firstTenant = batchTenants[0]
        await setTenantContext(prisma, firstTenant.id)

        const queryResults = await prisma.transaction.findMany({
          include: {
            account: { include: { user: true } },
            category: true
          },
          orderBy: { date: 'desc' },
          take: 100
        })

        const queryTestEnd = Date.now()
        const queryDuration = queryTestEnd - queryTestStart

        scalingResults.push({
          batch: batch + 1,
          tenantCount: (batch + 1) * initialTenantCount,
          creationTime: batchDuration,
          queryTime: queryDuration,
          resultsReturned: queryResults.length
        })

        console.log(`Batch ${batch + 1}: ${initialTenantCount} tenants, creation: ${batchDuration}ms, query: ${queryDuration}ms`)
      }

      // Analyze scaling performance
      scalingResults.forEach((result, index) => {
        expect(result.creationTime).toBeLessThan(120000) // Batch creation under 2 minutes
        expect(result.queryTime).toBeLessThan(5000) // Queries under 5 seconds
        expect(result.resultsReturned).toBeGreaterThan(0)
      })

      // Performance should not degrade significantly with more tenants
      const firstBatchQuery = scalingResults[0].queryTime
      const lastBatchQuery = scalingResults[scalingResults.length - 1].queryTime
      const performanceDegradation = lastBatchQuery / firstBatchQuery

      expect(performanceDegradation).toBeLessThan(3) // No more than 3x slower
    }, 600000) // 10 minute timeout

    it('should handle data volume limits per tenant', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Test creating large volumes of data and measuring performance impact
      const volumeTests = [1000, 5000, 10000]

      for (const volume of volumeTests) {
        const testStartTime = Date.now()

        // Create large batch of transactions
        const transactionData = Array(volume).fill(0).map((_, i) => ({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          categoryId: setup.categories.expense.id,
          amount: Math.random() * 100,
          type: 'EXPENSE' as const,
          description: `Volume test ${volume} - transaction ${i + 1}`,
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        }))

        const { duration: insertTime } = await PerformanceTestUtils.measureQueryTime(async () => {
          // Use chunked inserts for very large volumes
          const chunkSize = 1000
          for (let i = 0; i < transactionData.length; i += chunkSize) {
            const chunk = transactionData.slice(i, i + chunkSize)
            await prisma.transaction.createMany({
              data: chunk
            })
          }
        })

        // Test query performance with this volume
        const { duration: queryTime } = await PerformanceTestUtils.measureQueryTime(async () => {
          return prisma.transaction.findMany({
            where: { description: { startsWith: `Volume test ${volume}` } },
            orderBy: { date: 'desc' },
            take: 100,
            include: {
              account: true,
              category: true
            }
          })
        })

        // Test aggregation performance
        const { duration: aggregationTime } = await PerformanceTestUtils.measureQueryTime(async () => {
          return prisma.transaction.aggregate({
            where: { description: { startsWith: `Volume test ${volume}` } },
            _count: true,
            _sum: { amount: true },
            _avg: { amount: true }
          })
        })

        console.log(`Volume ${volume}: Insert: ${insertTime}ms, Query: ${queryTime}ms, Aggregation: ${aggregationTime}ms`)

        // Performance expectations based on volume
        const expectedInsertTime = volume <= 1000 ? 5000 : volume <= 5000 ? 15000 : 30000
        const expectedQueryTime = 3000
        const expectedAggregationTime = 5000

        expect(insertTime).toBeLessThan(expectedInsertTime)
        expect(queryTime).toBeLessThan(expectedQueryTime)
        expect(aggregationTime).toBeLessThan(expectedAggregationTime)

        // Clean up for next test
        await prisma.transaction.deleteMany({
          where: { description: { startsWith: `Volume test ${volume}` } }
        })
      }
    }, 300000)
  })

  describe('Network and Latency Performance', () => {
    it('should handle network latency simulation', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Simulate high-latency operations by adding controlled delays
      const latencySimulationTests = []

      for (let i = 0; i < 10; i++) {
        latencySimulationTests.push(
          (async () => {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100))

            const transaction = await testFactory.createTransaction({
              tenantId: setup.tenant.id,
              userId: setup.users.regular.id,
              accountId: setup.accounts.checking.id,
              amount: Math.random() * 100,
              description: `Latency test transaction ${i + 1}`
            })

            // Simulate another network delay
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50))

            const verification = await prisma.transaction.findUnique({
              where: { id: transaction.id },
              include: { account: true }
            })

            return { transaction, verification }
          })()
        )
      }

      const { duration: latencyTestTime, results: latencyResults } = await PerformanceTestUtils.measureQueryTime(async () => {
        return Promise.all(latencySimulationTests)
      })

      expect(latencyTestTime).toBeLessThan(10000) // Should complete despite simulated latency
      expect(latencyResults).toHaveLength(10)

      latencyResults.forEach(result => {
        expect(result.transaction).toBeTruthy()
        expect(result.verification).toBeTruthy()
        expect(result.verification.id).toBe(result.transaction.id)
      })
    })

    it('should optimize query patterns for performance', async () => {
      const setup = await testFactory.createTenantSetup()
      await setTenantContext(prisma, setup.tenant.id)

      // Create test data
      const categories = await Promise.all(
        Array(5).fill(0).map((_, i) =>
          testFactory.createCategory({
            tenantId: setup.tenant.id,
            name: `Performance Category ${i + 1}`
          })
        )
      )

      const accounts = await Promise.all(
        Array(3).fill(0).map((_, i) =>
          testFactory.createAccount({
            tenantId: setup.tenant.id,
            userId: setup.users.regular.id,
            name: `Performance Account ${i + 1}`,
            type: 'CHECKING'
          })
        )
      )

      // Create transactions
      const transactionData = []
      for (let i = 0; i < 1000; i++) {
        transactionData.push({
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: accounts[i % accounts.length].id,
          categoryId: categories[i % categories.length].id,
          amount: Math.random() * 500,
          type: i % 3 === 0 ? 'INCOME' : 'EXPENSE' as const,
          description: `Performance transaction ${i + 1}`,
          date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
        })
      }

      await prisma.transaction.createMany({
        data: transactionData
      })

      // Test optimized vs unoptimized query patterns

      // Optimized: Single query with includes
      const { duration: optimizedTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        return prisma.transaction.findMany({
          where: {
            date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          include: {
            account: true,
            category: true,
            user: true
          },
          orderBy: { date: 'desc' },
          take: 50
        })
      })

      // Unoptimized: Multiple separate queries (N+1 pattern simulation)
      const { duration: unoptimizedTime } = await PerformanceTestUtils.measureQueryTime(async () => {
        const transactions = await prisma.transaction.findMany({
          where: {
            date: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { date: 'desc' },
          take: 50
        })

        // Simulate N+1 queries
        for (const transaction of transactions.slice(0, 10)) { // Limit to avoid timeout
          await prisma.account.findUnique({
            where: { id: transaction.accountId }
          })

          if (transaction.categoryId) {
            await prisma.category.findUnique({
              where: { id: transaction.categoryId }
            })
          }
        }

        return transactions
      })

      console.log(`Optimized query time: ${optimizedTime}ms`)
      console.log(`Unoptimized query time: ${unoptimizedTime}ms`)

      expect(optimizedTime).toBeLessThan(unoptimizedTime)
      expect(optimizedTime).toBeLessThan(2000) // Optimized should be under 2 seconds
      expect(unoptimizedTime / optimizedTime).toBeGreaterThan(2) // Should be at least 2x faster
    })
  })
})