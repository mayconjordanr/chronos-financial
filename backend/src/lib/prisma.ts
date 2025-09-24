import { PrismaClient, Prisma } from '@prisma/client'
import { config } from '../config/env.js'

// Define Prisma client options
const prismaOptions: Prisma.PrismaClientOptions = {
  datasources: {
    db: {
      url: config.database.url,
    },
  },
  log: config.isDevelopment
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  errorFormat: 'pretty',
}

// Create Prisma client instance
const prisma = new PrismaClient(prismaOptions)

// Extend Prisma client with custom methods
const extendedPrisma = prisma.$extends({
  name: 'tenantIsolation',
  query: {
    // Automatically add tenantId to all queries where applicable
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Skip tenant isolation for public schema models
        const publicModels = ['Tenant', 'User', 'UserSession', 'TenantInvitation', 'AuditLog']

        if (publicModels.includes(model)) {
          return query(args)
        }

        // For tenant-scoped models, ensure tenantId is always included
        if (operation === 'findMany' || operation === 'findFirst' || operation === 'findUnique') {
          // Add tenantId to where clause if not present
          if (args.where && !args.where.tenantId) {
            throw new Error(`TenantId required for ${model}.${operation}`)
          }
        }

        if (operation === 'create' || operation === 'createMany') {
          // Add tenantId to data if not present
          if (operation === 'create' && args.data && !args.data.tenantId) {
            throw new Error(`TenantId required for ${model}.${operation}`)
          }
          if (operation === 'createMany' && args.data) {
            const dataArray = Array.isArray(args.data) ? args.data : [args.data]
            dataArray.forEach((item) => {
              if (!item.tenantId) {
                throw new Error(`TenantId required for ${model}.${operation}`)
              }
            })
          }
        }

        return query(args)
      },
    },
  },
})

// Middleware for soft deletes and audit logging
prisma.$use(async (params, next) => {
  const start = Date.now()

  try {
    const result = await next(params)
    const duration = Date.now() - start

    // Log slow queries in development
    if (config.isDevelopment && duration > 1000) {
      console.warn(`🐌 Slow query detected: ${params.model}.${params.action} took ${duration}ms`)
    }

    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`❌ Query failed: ${params.model}.${params.action} after ${duration}ms`, error)
    throw error
  }
})

// Connection event handlers
prisma.$on('beforeExit', async () => {
  console.log('🔌 Prisma client disconnecting...')
})

// Health check function
export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy', latency?: number }> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start

    return { status: 'healthy', latency }
  } catch (error) {
    console.error('Database health check failed:', error)
    return { status: 'unhealthy' }
  }
}

// Utility functions for multi-tenant operations
export const tenantUtils = {
  // Create a tenant-scoped Prisma client
  forTenant: (tenantId: string) => {
    return extendedPrisma.$extends({
      name: `tenant-${tenantId}`,
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Skip public models
            const publicModels = ['Tenant', 'User', 'UserSession', 'TenantInvitation', 'AuditLog']
            if (publicModels.includes(model)) {
              return query(args)
            }

            // Automatically inject tenantId
            if (operation === 'findMany' || operation === 'findFirst' || operation === 'findUnique') {
              args.where = { ...args.where, tenantId }
            }

            if (operation === 'create') {
              args.data = { ...args.data, tenantId }
            }

            if (operation === 'createMany') {
              const dataArray = Array.isArray(args.data) ? args.data : [args.data]
              args.data = dataArray.map(item => ({ ...item, tenantId }))
            }

            if (operation === 'update' || operation === 'updateMany' || operation === 'upsert' || operation === 'delete' || operation === 'deleteMany') {
              args.where = { ...args.where, tenantId }
            }

            return query(args)
          },
        },
      },
    })
  },

  // Validate tenant access
  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          tenantId: tenantId,
          status: 'ACTIVE',
        },
      })
      return !!user
    } catch (error) {
      console.error('Tenant access validation failed:', error)
      return false
    }
  },

  // Get tenant limits
  async getTenantLimits(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { limits: true },
    })

    return tenant?.limits || config.tenant.defaultLimits
  },

  // Check if tenant has reached limits
  async checkTenantLimits(tenantId: string, resource: 'users' | 'transactions' | 'accounts') {
    const limits = await this.getTenantLimits(tenantId)
    const tenantClient = this.forTenant(tenantId)

    let currentCount = 0

    switch (resource) {
      case 'users':
        currentCount = await prisma.user.count({ where: { tenantId } })
        break
      case 'transactions':
        currentCount = await tenantClient.transaction.count()
        break
      case 'accounts':
        currentCount = await tenantClient.account.count()
        break
    }

    const limit = limits[resource] || config.tenant.defaultLimits[resource]

    return {
      current: currentCount,
      limit: limit,
      exceeded: currentCount >= limit,
      remaining: Math.max(0, limit - currentCount),
    }
  },
}

// Export the extended Prisma client
export { extendedPrisma as prisma }

// Export default client for basic operations
export default prisma

// Types
export type ExtendedPrismaClient = typeof extendedPrisma
export type TenantPrismaClient = ReturnType<typeof tenantUtils.forTenant>