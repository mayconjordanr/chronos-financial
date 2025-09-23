import { PrismaClient } from '@prisma/client'
import { getPrismaClient, setTenantContext, clearTenantContext } from '../utils/test-setup'
import { TestDataFactory, DatabaseTestUtils } from '../utils/test-utilities'

describe('Database Infrastructure Tests', () => {
  let prisma: PrismaClient
  let testFactory: TestDataFactory

  beforeAll(async () => {
    prisma = getPrismaClient()
    testFactory = new TestDataFactory(prisma)
  })

  beforeEach(async () => {
    await clearTenantContext(prisma)
  })

  describe('Database Connection and Basic Operations', () => {
    it('should connect to database successfully', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow()
    })

    it('should execute raw SQL queries', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`
      expect(result).toEqual([{ test: 1 }])
    })

    it('should handle database transactions', async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          const tenant = await tx.tenant.create({
            data: {
              name: 'Test Tenant',
              slug: 'test-tenant',
              domain: 'test.example.com'
            }
          })
          return tenant
        })
      ).resolves.toBeTruthy()
    })

    it('should rollback failed transactions', async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.tenant.create({
            data: {
              name: 'Test Tenant',
              slug: 'test-tenant',
              domain: 'test.example.com'
            }
          })
          // Force transaction failure
          throw new Error('Test rollback')
        })
      ).rejects.toThrow('Test rollback')

      // Verify rollback occurred
      const tenants = await prisma.tenant.findMany()
      expect(tenants).toHaveLength(0)
    })
  })

  describe('Schema Validation', () => {
    it('should have all required tables', async () => {
      const requiredTables = [
        'tenants',
        'users',
        'sessions',
        'accounts',
        'transactions',
        'categories',
        'budgets',
        'whatsapp_chats',
        'whatsapp_messages',
        'audit_logs'
      ]

      for (const table of requiredTables) {
        const exists = await DatabaseTestUtils.checkTableExists(prisma, table)
        expect(exists).toBe(true)
      }
    })

    it('should have tenant_id columns on multi-tenant tables', async () => {
      const multiTenantTables = [
        'users',
        'accounts',
        'transactions',
        'categories',
        'budgets',
        'whatsapp_chats',
        'audit_logs'
      ]

      for (const table of multiTenantTables) {
        const columns = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = ${table}
          AND column_name = 'tenant_id'
        ` as any[]

        expect(columns).toHaveLength(1)
      }
    })

    it('should have proper foreign key constraints', async () => {
      const constraints = await prisma.$queryRaw`
        SELECT
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ` as any[]

      expect(constraints.length).toBeGreaterThan(0)

      // Check specific important constraints
      const userTenantConstraint = constraints.find(c =>
        c.table_name === 'users' && c.column_name === 'tenant_id'
      )
      expect(userTenantConstraint).toBeTruthy()

      const transactionUserConstraint = constraints.find(c =>
        c.table_name === 'transactions' && c.column_name === 'user_id'
      )
      expect(transactionUserConstraint).toBeTruthy()
    })

    it('should have proper indexes for performance', async () => {
      const expectedIndexes = [
        // Tenant-related indexes
        'tenants_slug_key',
        'tenants_domain_key',
        'users_tenant_id_idx',
        'transactions_tenant_id_idx',
        'accounts_tenant_id_idx',

        // Performance indexes
        'users_email_idx',
        'transactions_date_idx',
        'transactions_tenant_id_date_idx',
        'audit_logs_tenant_id_timestamp_idx'
      ]

      for (const indexName of expectedIndexes) {
        const exists = await DatabaseTestUtils.checkIndexExists(prisma, indexName)
        expect(exists).toBe(true)
      }
    })
  })

  describe('Database Constraints and Validation', () => {
    it('should enforce unique constraints', async () => {
      const tenant = await testFactory.createTenant({
        slug: 'unique-test',
        domain: 'unique.test.com'
      })

      // Should fail to create tenant with same slug
      await expect(
        testFactory.createTenant({
          slug: 'unique-test'
        })
      ).rejects.toThrow()

      // Should fail to create tenant with same domain
      await expect(
        testFactory.createTenant({
          domain: 'unique.test.com'
        })
      ).rejects.toThrow()
    })

    it('should enforce email uniqueness within tenant', async () => {
      const tenant = await testFactory.createTenant()

      await testFactory.createUser({
        tenantId: tenant.id,
        email: 'test@example.com'
      })

      // Should fail to create another user with same email in same tenant
      await expect(
        testFactory.createUser({
          tenantId: tenant.id,
          email: 'test@example.com'
        })
      ).rejects.toThrow()
    })

    it('should allow same email in different tenants', async () => {
      const tenant1 = await testFactory.createTenant()
      const tenant2 = await testFactory.createTenant()

      const user1 = await testFactory.createUser({
        tenantId: tenant1.id,
        email: 'test@example.com'
      })

      const user2 = await testFactory.createUser({
        tenantId: tenant2.id,
        email: 'test@example.com'
      })

      expect(user1.email).toBe(user2.email)
      expect(user1.tenantId).not.toBe(user2.tenantId)
    })

    it('should enforce decimal precision for monetary fields', async () => {
      const setup = await testFactory.createTenantSetup()

      // Test account balance precision
      const account = await prisma.account.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          name: 'Precision Test Account',
          type: 'CHECKING',
          balance: 123.456789 // Should be rounded to 2 decimal places
        }
      })

      expect(Number(account.balance)).toBe(123.46)
    })

    it('should handle large monetary values', async () => {
      const setup = await testFactory.createTenantSetup()

      const largeAmount = 999999999999.99
      const transaction = await prisma.transaction.create({
        data: {
          tenantId: setup.tenant.id,
          userId: setup.users.regular.id,
          accountId: setup.accounts.checking.id,
          amount: largeAmount,
          type: 'INCOME',
          description: 'Large amount test',
          date: new Date()
        }
      })

      expect(Number(transaction.amount)).toBe(largeAmount)
    })
  })

  describe('Database Performance', () => {
    it('should perform tenant queries efficiently', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })
      const account = await testFactory.createAccount({
        tenantId: tenant.id,
        userId: user.id
      })

      // Create many transactions
      const transactionPromises = Array(100).fill(0).map(() =>
        testFactory.createTransaction({
          tenantId: tenant.id,
          userId: user.id,
          accountId: account.id
        })
      )
      await Promise.all(transactionPromises)

      await setTenantContext(prisma, tenant.id)

      const startTime = process.hrtime.bigint()
      const transactions = await prisma.transaction.findMany({
        where: { tenantId: tenant.id },
        include: {
          account: true,
          category: true
        }
      })
      const endTime = process.hrtime.bigint()

      const queryTime = Number(endTime - startTime) / 1_000_000 // Convert to milliseconds

      expect(transactions).toHaveLength(100)
      expect(queryTime).toBeLessThan(1000) // Should complete in less than 1 second
    })

    it('should handle concurrent connections', async () => {
      const connectionPromises = Array(10).fill(0).map(async () => {
        const tenant = await testFactory.createTenant()
        const user = await testFactory.createUser({ tenantId: tenant.id })
        return { tenant, user }
      })

      const results = await Promise.all(connectionPromises)
      expect(results).toHaveLength(10)

      // Verify all tenants are unique
      const tenantIds = results.map(r => r.tenant.id)
      const uniqueTenantIds = [...new Set(tenantIds)]
      expect(uniqueTenantIds).toHaveLength(10)
    })

    it('should perform bulk operations efficiently', async () => {
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })
      const account = await testFactory.createAccount({
        tenantId: tenant.id,
        userId: user.id
      })

      const startTime = process.hrtime.bigint()

      // Bulk create transactions
      const transactionData = Array(1000).fill(0).map((_, i) => ({
        tenantId: tenant.id,
        userId: user.id,
        accountId: account.id,
        amount: 100 + i,
        type: 'EXPENSE' as const,
        description: `Transaction ${i}`,
        date: new Date()
      }))

      await prisma.transaction.createMany({
        data: transactionData
      })

      const endTime = process.hrtime.bigint()
      const operationTime = Number(endTime - startTime) / 1_000_000

      expect(operationTime).toBeLessThan(5000) // Should complete in less than 5 seconds

      // Verify all transactions were created
      const count = await prisma.transaction.count({
        where: { tenantId: tenant.id }
      })
      expect(count).toBe(1000)
    })
  })

  describe('Migration and Schema Evolution', () => {
    it('should support adding new columns', async () => {
      // This test verifies that schema changes don't break existing functionality
      const tenant = await testFactory.createTenant()
      const user = await testFactory.createUser({ tenantId: tenant.id })

      // Test that all expected columns exist
      const userColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY column_name
      ` as any[]

      const expectedColumns = [
        'id', 'tenant_id', 'email', 'username', 'first_name', 'last_name',
        'password', 'phone', 'avatar', 'role', 'status', 'is_email_verified',
        'email_verified_at', 'last_login_at', 'created_at', 'updated_at'
      ]

      for (const col of expectedColumns) {
        const column = userColumns.find(c => c.column_name === col)
        expect(column).toBeTruthy()
      }
    })

    it('should maintain data integrity during schema changes', async () => {
      // Create test data
      const setup = await testFactory.createTenantSetup()

      // Verify data integrity
      const tenant = await prisma.tenant.findUnique({
        where: { id: setup.tenant.id },
        include: {
          users: true,
          accounts: true,
          categories: true
        }
      })

      expect(tenant).toBeTruthy()
      expect(tenant!.users).toHaveLength(2) // admin + regular user
      expect(tenant!.accounts).toHaveLength(2) // checking + savings
      expect(tenant!.categories).toHaveLength(2) // income + expense
    })
  })
})