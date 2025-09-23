import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Global test configuration
export const TEST_CONFIG = {
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://chronos_user:chronos_password@localhost:5432/chronos_test',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: 'test_jwt_secret',
  BCRYPT_ROUNDS: 4, // Lower rounds for faster tests
  TEST_TIMEOUT: 30000,
  TENANT_ISOLATION_TIMEOUT: 10000
}

// Global Prisma client for tests
let prisma: PrismaClient | null = null

// Test database setup and teardown
export const setupTestDatabase = async (): Promise<PrismaClient> => {
  if (prisma) {
    return prisma
  }

  // Create unique test database
  const testDbName = `chronos_test_${randomBytes(4).toString('hex')}`
  const baseUrl = TEST_CONFIG.DATABASE_URL.split('/').slice(0, -1).join('/')
  const testDbUrl = `${baseUrl}/${testDbName}`

  try {
    // Create test database
    execSync(`createdb -h localhost -U chronos_user ${testDbName}`, {
      stdio: 'pipe',
      env: { ...process.env, PGPASSWORD: 'chronos_password' }
    })

    // Initialize Prisma client with test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbUrl
        }
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error', 'warn']
    })

    // Run migrations
    process.env.DATABASE_URL = testDbUrl
    execSync('npx prisma migrate deploy', { cwd: process.cwd() })

    // Set up RLS and tenant context functions
    await setupRLSFunctions(prisma)

    return prisma
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
}

export const teardownTestDatabase = async (): Promise<void> => {
  if (!prisma) return

  try {
    // Extract database name from URL
    const dbUrl = prisma.$connect.name || TEST_CONFIG.DATABASE_URL
    const testDbName = dbUrl.split('/').pop()

    // Disconnect Prisma
    await prisma.$disconnect()
    prisma = null

    // Drop test database
    if (testDbName?.startsWith('chronos_test_')) {
      execSync(`dropdb -h localhost -U chronos_user ${testDbName}`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'chronos_password' }
      })
    }
  } catch (error) {
    console.error('Failed to teardown test database:', error)
  }
}

// Set up RLS functions and policies
export const setupRLSFunctions = async (client: PrismaClient): Promise<void> => {
  await client.$executeRaw`
    CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
    BEGIN
      RETURN COALESCE(current_setting('app.current_tenant_id', true), '');
    END;
    $$ LANGUAGE plpgsql STABLE;
  `

  await client.$executeRaw`
    CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT) RETURNS VOID AS $$
    BEGIN
      PERFORM set_config('app.current_tenant_id', tenant_id, false);
    END;
    $$ LANGUAGE plpgsql;
  `

  // Enable RLS on all tenant-aware tables
  const tables = ['users', 'accounts', 'transactions', 'categories', 'budgets', 'whatsapp_chats', 'audit_logs']

  for (const table of tables) {
    await client.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)

    await client.$executeRawUnsafe(`
      DROP POLICY IF EXISTS tenant_isolation ON ${table}
    `)

    await client.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON ${table}
      FOR ALL
      TO PUBLIC
      USING (tenant_id = current_tenant_id())
      WITH CHECK (tenant_id = current_tenant_id())
    `)
  }
}

// Set tenant context for tests
export const setTenantContext = async (client: PrismaClient, tenantId: string): Promise<void> => {
  await client.$executeRaw`SELECT set_tenant_context(${tenantId})`
}

// Clear tenant context
export const clearTenantContext = async (client: PrismaClient): Promise<void> => {
  await client.$executeRaw`SELECT set_tenant_context('')`
}

// Jest setup hooks
beforeAll(async () => {
  await setupTestDatabase()
})

afterAll(async () => {
  await teardownTestDatabase()
})

beforeEach(async () => {
  if (prisma) {
    // Clear tenant context before each test
    await clearTenantContext(prisma)
  }
})

afterEach(async () => {
  if (prisma) {
    // Clean up test data after each test
    await clearTenantContext(prisma)

    // Truncate all tables (in reverse dependency order)
    const tables = [
      'whatsapp_messages',
      'whatsapp_chats',
      'audit_logs',
      'transactions',
      'budgets',
      'categories',
      'accounts',
      'sessions',
      'users',
      'tenants'
    ]

    for (const table of tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`)
    }
  }
})

// Export prisma client getter
export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }
  return prisma
}

// Utility to wait for condition
export const waitFor = async (
  condition: () => Promise<boolean> | boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

// Error matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },
})

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
    }
  }
}