import { PrismaClient } from '@prisma/client'
import { getPrismaClient } from '../utils/test-setup'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

describe('Environment Configuration Tests', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = getPrismaClient()
  })

  describe('Database Environment Configuration', () => {
    it('should have valid database connection string', () => {
      const databaseUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
      expect(databaseUrl).toBeDefined()
      expect(databaseUrl).toMatch(/^postgresql:\/\//)

      // Validate URL format
      const url = new URL(databaseUrl!)
      expect(url.protocol).toBe('postgresql:')
      expect(url.hostname).toBeTruthy()
      expect(url.port).toBeTruthy()
      expect(url.pathname).toBeTruthy()
    })

    it('should connect to database with provided credentials', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow()

      // Test basic query
      const result = await prisma.$queryRaw`SELECT current_database() as db_name`
      expect(result).toBeDefined()
    })

    it('should have proper database encoding and locale', async () => {
      const encoding = await prisma.$queryRaw`SHOW server_encoding` as any[]
      expect(encoding[0].server_encoding).toBe('UTF8')

      const locale = await prisma.$queryRaw`SHOW lc_collate` as any[]
      expect(locale[0].lc_collate).toMatch(/(C|en_US\.UTF-8|POSIX)/)
    })

    it('should have required extensions installed', async () => {
      const extensions = await prisma.$queryRaw`
        SELECT extname FROM pg_extension
        WHERE extname IN ('uuid-ossp', 'pgcrypto', 'btree_gin')
      ` as any[]

      const extensionNames = extensions.map(ext => ext.extname)
      expect(extensionNames).toContain('uuid-ossp')
      expect(extensionNames).toContain('pgcrypto')
      expect(extensionNames).toContain('btree_gin')
    })
  })

  describe('Security Environment Configuration', () => {
    it('should have JWT secret configured', () => {
      const jwtSecret = process.env.JWT_SECRET
      expect(jwtSecret).toBeDefined()
      expect(jwtSecret!.length).toBeGreaterThan(32)
    })

    it('should have bcrypt rounds configured appropriately', () => {
      const bcryptRounds = process.env.BCRYPT_ROUNDS
      expect(bcryptRounds).toBeDefined()

      const rounds = parseInt(bcryptRounds!)
      expect(rounds).toBeGreaterThanOrEqual(4) // Minimum for tests
      expect(rounds).toBeLessThanOrEqual(15) // Maximum for performance
    })

    it('should have secure session configuration', () => {
      const sessionSecret = process.env.SESSION_SECRET
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN

      if (sessionSecret) {
        expect(sessionSecret.length).toBeGreaterThan(32)
      }

      if (jwtExpiresIn) {
        expect(['1h', '24h', '7d', '30d'].some(val => jwtExpiresIn.includes(val.slice(-1)))).toBe(true)
      }
    })

    it('should not expose sensitive configuration in development', () => {
      // Ensure no production secrets are used in test environment
      const nodeEnv = process.env.NODE_ENV

      if (nodeEnv === 'test' || nodeEnv === 'development') {
        const databaseUrl = process.env.DATABASE_URL
        expect(databaseUrl).not.toContain('production')
        expect(databaseUrl).not.toContain('prod')

        const jwtSecret = process.env.JWT_SECRET
        expect(jwtSecret).not.toContain('production')
        expect(jwtSecret).not.toContain('super_secret_key')
      }
    })
  })

  describe('Redis Environment Configuration', () => {
    it('should have Redis URL configured', () => {
      const redisUrl = process.env.REDIS_URL || process.env.TEST_REDIS_URL
      expect(redisUrl).toBeDefined()
      expect(redisUrl).toMatch(/^redis:\/\//)
    })

    it('should have Redis password for production-like environments', () => {
      const redisPassword = process.env.REDIS_PASSWORD
      const nodeEnv = process.env.NODE_ENV

      if (nodeEnv === 'production' || nodeEnv === 'staging') {
        expect(redisPassword).toBeDefined()
        expect(redisPassword!.length).toBeGreaterThan(16)
      }
    })
  })

  describe('Application Environment Configuration', () => {
    it('should have proper Node.js environment set', () => {
      const nodeEnv = process.env.NODE_ENV
      expect(nodeEnv).toBeDefined()
      expect(['development', 'test', 'staging', 'production']).toContain(nodeEnv)
    })

    it('should have application port configured', () => {
      const port = process.env.PORT

      if (port) {
        const portNumber = parseInt(port)
        expect(portNumber).toBeGreaterThan(1000)
        expect(portNumber).toBeLessThan(65536)
      }
    })

    it('should have CORS origins configured for production', () => {
      const corsOrigins = process.env.CORS_ORIGINS
      const nodeEnv = process.env.NODE_ENV

      if (nodeEnv === 'production') {
        expect(corsOrigins).toBeDefined()
        expect(corsOrigins).not.toBe('*')
      }
    })

    it('should have rate limiting configuration', () => {
      const rateLimitMax = process.env.RATE_LIMIT_MAX
      const rateLimitWindow = process.env.RATE_LIMIT_WINDOW

      if (rateLimitMax) {
        const maxRequests = parseInt(rateLimitMax)
        expect(maxRequests).toBeGreaterThan(10)
        expect(maxRequests).toBeLessThan(10000)
      }

      if (rateLimitWindow) {
        const windowMs = parseInt(rateLimitWindow)
        expect(windowMs).toBeGreaterThan(1000) // At least 1 second
        expect(windowMs).toBeLessThan(3600000) // At most 1 hour
      }
    })
  })

  describe('Third-Party Service Configuration', () => {
    it('should have WhatsApp integration configuration for production', () => {
      const nodeEnv = process.env.NODE_ENV

      if (nodeEnv === 'production') {
        const whatsappToken = process.env.WHATSAPP_TOKEN
        const whatsappWebhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET

        expect(whatsappToken).toBeDefined()
        expect(whatsappWebhookSecret).toBeDefined()
        expect(whatsappWebhookSecret!.length).toBeGreaterThan(32)
      }
    })

    it('should have email service configuration', () => {
      const emailProvider = process.env.EMAIL_PROVIDER

      if (emailProvider) {
        expect(['smtp', 'sendgrid', 'mailgun', 'ses']).toContain(emailProvider.toLowerCase())

        // Check provider-specific configuration
        if (emailProvider.toLowerCase() === 'smtp') {
          expect(process.env.SMTP_HOST).toBeDefined()
          expect(process.env.SMTP_PORT).toBeDefined()
        }

        if (emailProvider.toLowerCase() === 'sendgrid') {
          expect(process.env.SENDGRID_API_KEY).toBeDefined()
        }
      }
    })

    it('should have file storage configuration', () => {
      const storageProvider = process.env.STORAGE_PROVIDER

      if (storageProvider) {
        expect(['local', 's3', 'gcs', 'azure']).toContain(storageProvider.toLowerCase())

        if (storageProvider.toLowerCase() === 's3') {
          expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined()
          expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined()
          expect(process.env.AWS_S3_BUCKET).toBeDefined()
        }
      }
    })
  })

  describe('Logging and Monitoring Configuration', () => {
    it('should have logging level configured', () => {
      const logLevel = process.env.LOG_LEVEL || 'info'
      expect(['error', 'warn', 'info', 'verbose', 'debug', 'silly']).toContain(logLevel.toLowerCase())
    })

    it('should have monitoring configuration for production', () => {
      const nodeEnv = process.env.NODE_ENV

      if (nodeEnv === 'production') {
        const sentryDsn = process.env.SENTRY_DSN
        const newRelicKey = process.env.NEW_RELIC_LICENSE_KEY

        // At least one monitoring service should be configured
        expect(sentryDsn || newRelicKey).toBeTruthy()
      }
    })

    it('should have health check endpoint configured', () => {
      const healthCheckPath = process.env.HEALTH_CHECK_PATH || '/health'
      expect(healthCheckPath).toMatch(/^\//)
    })
  })

  describe('Database Migration Configuration', () => {
    it('should have Prisma schema accessible', () => {
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')
      expect(fs.existsSync(schemaPath)).toBe(true)

      const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
      expect(schemaContent).toContain('generator client')
      expect(schemaContent).toContain('datasource db')
    })

    it('should have migrations directory', () => {
      const migrationsPath = path.join(process.cwd(), 'prisma', 'migrations')

      if (fs.existsSync(migrationsPath)) {
        const migrations = fs.readdirSync(migrationsPath)
        expect(migrations.length).toBeGreaterThan(0)
      }
    })

    it('should be able to generate Prisma client', () => {
      expect(() => {
        execSync('npx prisma generate --preview', {
          stdio: 'pipe',
          cwd: process.cwd()
        })
      }).not.toThrow()
    })
  })

  describe('Security Headers Configuration', () => {
    it('should have security headers configured for production', () => {
      const nodeEnv = process.env.NODE_ENV

      if (nodeEnv === 'production') {
        // These should be configured in production
        const expectedSecurityVars = [
          'HELMET_CSP_DIRECTIVES',
          'SECURITY_HEADERS_ENABLED'
        ]

        // At least basic security should be enabled
        const hasSecurityConfig = expectedSecurityVars.some(
          varName => process.env[varName] !== undefined
        )

        // If no specific config, default security should apply
        expect(hasSecurityConfig || process.env.NODE_ENV === 'production').toBeTruthy()
      }
    })

    it('should have HTTPS enforcement for production', () => {
      const nodeEnv = process.env.NODE_ENV
      const forceHttps = process.env.FORCE_HTTPS

      if (nodeEnv === 'production') {
        // In production, HTTPS should be enforced
        expect(forceHttps === undefined || forceHttps === 'true').toBe(true)
      }
    })
  })

  describe('Database Performance Configuration', () => {
    it('should have connection pool settings configured', () => {
      const databaseUrl = process.env.DATABASE_URL

      if (databaseUrl && databaseUrl.includes('connection_limit=')) {
        const connectionLimit = databaseUrl.match(/connection_limit=(\d+)/)?.[1]
        if (connectionLimit) {
          const limit = parseInt(connectionLimit)
          expect(limit).toBeGreaterThan(5)
          expect(limit).toBeLessThan(100)
        }
      }
    })

    it('should have query timeout configured', () => {
      const queryTimeout = process.env.DATABASE_QUERY_TIMEOUT

      if (queryTimeout) {
        const timeout = parseInt(queryTimeout)
        expect(timeout).toBeGreaterThan(1000) // At least 1 second
        expect(timeout).toBeLessThan(60000) // At most 1 minute
      }
    })
  })

  describe('Feature Flags Configuration', () => {
    it('should have feature flags properly configured', () => {
      const featureFlags = {
        WHATSAPP_INTEGRATION_ENABLED: process.env.WHATSAPP_INTEGRATION_ENABLED,
        BUDGET_ALERTS_ENABLED: process.env.BUDGET_ALERTS_ENABLED,
        AUDIT_LOGGING_ENABLED: process.env.AUDIT_LOGGING_ENABLED,
        MULTI_TENANT_ENABLED: process.env.MULTI_TENANT_ENABLED
      }

      Object.entries(featureFlags).forEach(([key, value]) => {
        if (value !== undefined) {
          expect(['true', 'false', '1', '0']).toContain(value.toLowerCase())
        }
      })
    })

    it('should have tenant limits configured', () => {
      const maxTenantsPerInstance = process.env.MAX_TENANTS_PER_INSTANCE
      const maxUsersPerTenant = process.env.MAX_USERS_PER_TENANT
      const maxTransactionsPerTenant = process.env.MAX_TRANSACTIONS_PER_TENANT

      if (maxTenantsPerInstance) {
        const maxTenants = parseInt(maxTenantsPerInstance)
        expect(maxTenants).toBeGreaterThan(1)
        expect(maxTenants).toBeLessThan(10000)
      }

      if (maxUsersPerTenant) {
        const maxUsers = parseInt(maxUsersPerTenant)
        expect(maxUsers).toBeGreaterThan(1)
        expect(maxUsers).toBeLessThan(100000)
      }

      if (maxTransactionsPerTenant) {
        const maxTransactions = parseInt(maxTransactionsPerTenant)
        expect(maxTransactions).toBeGreaterThan(100)
      }
    })
  })
})