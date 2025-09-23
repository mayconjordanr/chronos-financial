import { PrismaClient, Tenant, User, Account, Transaction, Category, Budget } from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// Type definitions for test factories
export interface CreateTenantOptions {
  name?: string
  slug?: string
  domain?: string
  status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  plan?: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  currency?: string
  timezone?: string
  locale?: string
}

export interface CreateUserOptions {
  tenantId: string
  email?: string
  username?: string
  firstName?: string
  lastName?: string
  password?: string
  role?: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'USER' | 'VIEWER'
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
}

export interface CreateAccountOptions {
  tenantId: string
  userId: string
  name?: string
  type?: 'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'INVESTMENT' | 'LOAN' | 'CASH' | 'OTHER'
  balance?: number
  currency?: string
}

export interface CreateTransactionOptions {
  tenantId: string
  userId: string
  accountId: string
  categoryId?: string
  amount?: number
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  description?: string
  date?: Date
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED'
}

export interface CreateCategoryOptions {
  tenantId: string
  name?: string
  description?: string
  color?: string
  icon?: string
  parentId?: string
  isSystem?: boolean
}

export interface CreateBudgetOptions {
  tenantId: string
  userId: string
  accountId?: string
  categoryId?: string
  name?: string
  amount?: number
  period?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  startDate?: Date
  endDate?: Date
}

// Test data factories
export class TestDataFactory {
  constructor(private prisma: PrismaClient) {}

  // Tenant factory
  async createTenant(options: CreateTenantOptions = {}): Promise<Tenant> {
    const slug = options.slug || faker.internet.domainWord()
    const domain = options.domain || `${slug}.chronos.app`

    return this.prisma.tenant.create({
      data: {
        name: options.name || faker.company.name(),
        slug,
        domain,
        status: options.status || 'ACTIVE',
        plan: options.plan || 'FREE',
        currency: options.currency || 'USD',
        timezone: options.timezone || 'UTC',
        locale: options.locale || 'en',
        settings: {
          features: {
            whatsappIntegration: true,
            budgetAlerts: true,
            categoryManagement: true
          },
          limits: {
            users: 10,
            transactions: 1000,
            accounts: 5
          }
        }
      }
    })
  }

  // User factory
  async createUser(options: CreateUserOptions): Promise<User> {
    const email = options.email || faker.internet.email()
    const password = options.password || 'TestPassword123!'
    const hashedPassword = await bcrypt.hash(password, 4)

    return this.prisma.user.create({
      data: {
        tenantId: options.tenantId,
        email,
        username: options.username || faker.internet.userName(),
        firstName: options.firstName || faker.person.firstName(),
        lastName: options.lastName || faker.person.lastName(),
        password: hashedPassword,
        phone: faker.phone.number(),
        role: options.role || 'USER',
        status: options.status || 'ACTIVE',
        isEmailVerified: true,
        emailVerifiedAt: new Date()
      }
    })
  }

  // Account factory
  async createAccount(options: CreateAccountOptions): Promise<Account> {
    return this.prisma.account.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId,
        name: options.name || faker.finance.accountName(),
        type: options.type || 'CHECKING',
        balance: options.balance || parseFloat(faker.finance.amount()),
        currency: options.currency || 'USD',
        description: faker.lorem.sentence(),
        bankName: faker.company.name(),
        accountNumber: faker.finance.accountNumber(),
        routingNumber: faker.finance.routingNumber()
      }
    })
  }

  // Category factory
  async createCategory(options: CreateCategoryOptions): Promise<Category> {
    return this.prisma.category.create({
      data: {
        tenantId: options.tenantId,
        name: options.name || faker.commerce.department(),
        description: options.description || faker.lorem.sentence(),
        color: options.color || faker.color.hex(),
        icon: options.icon || 'category',
        parentId: options.parentId,
        isSystem: options.isSystem || false
      }
    })
  }

  // Transaction factory
  async createTransaction(options: CreateTransactionOptions): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId,
        accountId: options.accountId,
        categoryId: options.categoryId,
        amount: options.amount || parseFloat(faker.finance.amount()),
        type: options.type || 'EXPENSE',
        description: options.description || faker.commerce.productDescription(),
        notes: faker.lorem.sentence(),
        date: options.date || faker.date.recent(),
        status: options.status || 'COMPLETED',
        reference: faker.string.alphanumeric(10),
        tags: [faker.word.noun(), faker.word.noun()]
      }
    })
  }

  // Budget factory
  async createBudget(options: CreateBudgetOptions): Promise<Budget> {
    const startDate = options.startDate || faker.date.recent()
    const endDate = options.endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days later

    return this.prisma.budget.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId,
        accountId: options.accountId,
        categoryId: options.categoryId,
        name: options.name || `${faker.commerce.department()} Budget`,
        description: faker.lorem.sentence(),
        amount: options.amount || parseFloat(faker.finance.amount()),
        period: options.period || 'MONTHLY',
        startDate,
        endDate,
        alertThreshold: 80.0
      }
    })
  }

  // Create complete tenant setup
  async createTenantSetup(tenantOptions: CreateTenantOptions = {}) {
    const tenant = await this.createTenant(tenantOptions)

    // Create admin user
    const adminUser = await this.createUser({
      tenantId: tenant.id,
      role: 'TENANT_ADMIN',
      email: 'admin@example.com'
    })

    // Create regular user
    const regularUser = await this.createUser({
      tenantId: tenant.id,
      role: 'USER',
      email: 'user@example.com'
    })

    // Create categories
    const incomeCategory = await this.createCategory({
      tenantId: tenant.id,
      name: 'Income',
      isSystem: true
    })

    const expenseCategory = await this.createCategory({
      tenantId: tenant.id,
      name: 'Expenses',
      isSystem: true
    })

    // Create accounts
    const checkingAccount = await this.createAccount({
      tenantId: tenant.id,
      userId: regularUser.id,
      type: 'CHECKING',
      balance: 1000.00
    })

    const savingsAccount = await this.createAccount({
      tenantId: tenant.id,
      userId: regularUser.id,
      type: 'SAVINGS',
      balance: 5000.00
    })

    return {
      tenant,
      users: { admin: adminUser, regular: regularUser },
      categories: { income: incomeCategory, expense: expenseCategory },
      accounts: { checking: checkingAccount, savings: savingsAccount }
    }
  }

  // Bulk create transactions for testing
  async createBulkTransactions(
    tenantId: string,
    userId: string,
    accountId: string,
    categoryId: string,
    count: number = 10
  ): Promise<Transaction[]> {
    const transactions = []

    for (let i = 0; i < count; i++) {
      const transaction = await this.createTransaction({
        tenantId,
        userId,
        accountId,
        categoryId,
        amount: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
        type: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
        date: faker.date.recent({ days: 30 })
      })
      transactions.push(transaction)
    }

    return transactions
  }
}

// Performance testing utilities
export class PerformanceTestUtils {
  static async measureQueryTime<T>(queryFn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint()
    const result = await queryFn()
    const end = process.hrtime.bigint()
    const duration = Number(end - start) / 1_000_000 // Convert to milliseconds

    return { result, duration }
  }

  static async runLoadTest<T>(
    testFn: () => Promise<T>,
    concurrent: number = 10,
    iterations: number = 100
  ): Promise<{ results: T[]; totalTime: number; avgTime: number; maxTime: number; minTime: number }> {
    const start = process.hrtime.bigint()
    const results: T[] = []
    const times: number[] = []

    // Run tests in batches to control concurrency
    for (let i = 0; i < iterations; i += concurrent) {
      const batch = Math.min(concurrent, iterations - i)
      const promises = Array(batch).fill(0).map(async () => {
        const { result, duration } = await this.measureQueryTime(testFn)
        times.push(duration)
        return result
      })

      const batchResults = await Promise.all(promises)
      results.push(...batchResults)
    }

    const end = process.hrtime.bigint()
    const totalTime = Number(end - start) / 1_000_000

    return {
      results,
      totalTime,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxTime: Math.max(...times),
      minTime: Math.min(...times)
    }
  }
}

// Security testing utilities
export class SecurityTestUtils {
  static generateSqlInjectionPayloads(): string[] {
    return [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; DELETE FROM transactions; --",
      "' OR 1=1 --",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "') OR ('1'='1",
      "' AND (SELECT COUNT(*) FROM users) > 0 --"
    ]
  }

  static generateXssPayloads(): string[] {
    return [
      "<script>alert('xss')</script>",
      "<img src=x onerror=alert('xss')>",
      "javascript:alert('xss')",
      "<svg onload=alert('xss')>",
      "';alert('xss');//",
      "<iframe src=javascript:alert('xss')>",
      "<body onload=alert('xss')>",
      "<input autofocus onfocus=alert('xss')>",
      "<select onfocus=alert('xss') autofocus>",
      "<textarea autofocus onfocus=alert('xss')>"
    ]
  }

  static async testTenantIsolation(
    prisma: PrismaClient,
    tenant1Id: string,
    tenant2Id: string,
    testFn: (tenantId: string) => Promise<any>
  ): Promise<{ tenant1Result: any; tenant2Result: any; isIsolated: boolean }> {
    // Set context for tenant 1 and run test
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1Id})`
    const tenant1Result = await testFn(tenant1Id)

    // Set context for tenant 2 and run test
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant2Id})`
    const tenant2Result = await testFn(tenant2Id)

    // Check if results are properly isolated
    const isIsolated = JSON.stringify(tenant1Result) !== JSON.stringify(tenant2Result)

    return { tenant1Result, tenant2Result, isIsolated }
  }
}

// Database testing utilities
export class DatabaseTestUtils {
  static async checkTableExists(prisma: PrismaClient, tableName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        )
      ` as [{ exists: boolean }]

      return result[0].exists
    } catch {
      return false
    }
  }

  static async checkRLSEnabled(prisma: PrismaClient, tableName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw`
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = ${tableName}
      ` as [{ relrowsecurity: boolean }]

      return result[0]?.relrowsecurity || false
    } catch {
      return false
    }
  }

  static async checkPolicyExists(prisma: PrismaClient, tableName: string, policyName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM pg_policies
          WHERE tablename = ${tableName}
          AND policyname = ${policyName}
        )
      ` as [{ exists: boolean }]

      return result[0].exists
    } catch {
      return false
    }
  }

  static async getTableRowCount(prisma: PrismaClient, tableName: string): Promise<number> {
    try {
      const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName}`) as [{ count: bigint }]
      return Number(result[0].count)
    } catch {
      return 0
    }
  }

  static async checkIndexExists(prisma: PrismaClient, indexName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE indexname = ${indexName}
        )
      ` as [{ exists: boolean }]

      return result[0].exists
    } catch {
      return false
    }
  }
}

// Export utilities
export { faker }
export const generateTestId = (): string => randomBytes(8).toString('hex')
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))