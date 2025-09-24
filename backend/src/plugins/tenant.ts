import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { prisma, tenantUtils } from '../lib/prisma.js'
import { config } from '../config/env.js'

// Tenant context
export interface TenantContext {
  id: string
  name: string
  slug: string
  status: string
  settings: any
  features: any
  limits: any
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext
    tenantClient?: ReturnType<typeof tenantUtils.forTenant>
  }

  interface FastifyInstance {
    validateTenant: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    getTenantFromRequest: (request: FastifyRequest) => string | null
    checkTenantLimits: (tenantId: string, resource: string) => Promise<any>
  }
}

export const tenantPlugin = fastifyPlugin(async (server: FastifyInstance) => {
  // Tenant ID extraction utility
  server.decorate('getTenantFromRequest', (request: FastifyRequest): string | null => {
    // Try different methods to get tenant ID

    // 1. From authenticated user (most common)
    if (request.user?.tenantId) {
      return request.user.tenantId
    }

    // 2. From X-Tenant-ID header
    const tenantHeader = request.headers['x-tenant-id'] as string
    if (tenantHeader) {
      return tenantHeader
    }

    // 3. From subdomain
    const host = request.headers.host
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0]
      // Skip common subdomains
      if (!['www', 'api', 'app'].includes(subdomain)) {
        return subdomain
      }
    }

    // 4. From URL path parameter
    const pathTenantId = request.params && (request.params as any).tenantId
    if (pathTenantId) {
      return pathTenantId
    }

    return null
  })

  // Tenant validation decorator
  server.decorate('validateTenant', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tenantId = server.getTenantFromRequest(request)

      if (!tenantId) {
        throw server.httpErrors.badRequest('Tenant ID is required')
      }

      // Validate tenant ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(tenantId)) {
        throw server.httpErrors.badRequest('Invalid tenant ID format')
      }

      // Fetch tenant from database
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          settings: true,
          features: true,
          limits: true,
          planType: true,
          trialEndsAt: true,
        },
      })

      if (!tenant) {
        throw server.httpErrors.notFound('Tenant not found')
      }

      // Check tenant status
      if (tenant.status !== 'ACTIVE') {
        if (tenant.status === 'TRIAL' && tenant.trialEndsAt && tenant.trialEndsAt < new Date()) {
          throw server.httpErrors.forbidden('Tenant trial has expired')
        }
        if (tenant.status === 'SUSPENDED') {
          throw server.httpErrors.forbidden('Tenant account is suspended')
        }
        if (tenant.status === 'EXPIRED') {
          throw server.httpErrors.forbidden('Tenant subscription has expired')
        }
        throw server.httpErrors.forbidden(`Tenant account is ${tenant.status.toLowerCase()}`)
      }

      // Validate user has access to this tenant (if authenticated)
      if (request.user && request.user.tenantId !== tenantId) {
        throw server.httpErrors.forbidden('Access denied to this tenant')
      }

      // Set tenant context
      request.tenant = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        settings: tenant.settings,
        features: tenant.features,
        limits: tenant.limits,
      }

      // Create tenant-scoped Prisma client
      request.tenantClient = tenantUtils.forTenant(tenantId)

      // Set tenant ID for convenience
      request.tenantId = tenantId

    } catch (error) {
      server.log.error({ error, url: request.url }, 'Tenant validation failed')

      if (error.statusCode) {
        throw error
      }

      throw server.httpErrors.badRequest('Tenant validation failed')
    }
  })

  // Tenant limits checking decorator
  server.decorate('checkTenantLimits', async (tenantId: string, resource: string) => {
    const validResources = ['users', 'transactions', 'accounts', 'storage']

    if (!validResources.includes(resource)) {
      throw new Error(`Invalid resource: ${resource}`)
    }

    return tenantUtils.checkTenantLimits(tenantId, resource as any)
  })

  // Pre-handler hook for tenant feature checks
  server.addHook('onRequest', async (request, reply) => {
    // Add method to check if tenant has feature enabled
    request.requireFeature = (feature: string) => {
      if (!request.tenant) {
        throw server.httpErrors.badRequest('Tenant context required')
      }

      const features = request.tenant.features || {}

      // Check global feature flags first
      if (feature === 'multiTenant' && !config.features.multiTenant) {
        throw server.httpErrors.forbidden('Multi-tenancy is disabled')
      }

      if (feature === 'realTimeUpdates' && !config.features.realTimeUpdates) {
        throw server.httpErrors.forbidden('Real-time updates are disabled')
      }

      if (feature === 'whatsappIntegration' && !config.features.whatsappIntegration) {
        throw server.httpErrors.forbidden('WhatsApp integration is disabled')
      }

      if (feature === 'stripeIntegration' && !config.features.stripeIntegration) {
        throw server.httpErrors.forbidden('Stripe integration is disabled')
      }

      // Check tenant-specific feature flags
      if (!features[feature]) {
        throw server.httpErrors.forbidden(`Feature '${feature}' is not enabled for this tenant`)
      }
    }

    // Add method to check resource limits
    request.checkLimit = async (resource: string) => {
      if (!request.tenant) {
        throw server.httpErrors.badRequest('Tenant context required')
      }

      const limits = await server.checkTenantLimits(request.tenant.id, resource)

      if (limits.exceeded) {
        throw server.httpErrors.forbidden(
          `${resource.charAt(0).toUpperCase() + resource.slice(1)} limit exceeded. ` +
          `Current: ${limits.current}, Limit: ${limits.limit}`
        )
      }

      return limits
    }

    // Add method to get tenant setting
    request.getTenantSetting = (key: string, defaultValue?: any) => {
      if (!request.tenant) {
        return defaultValue
      }

      const settings = request.tenant.settings || {}
      return settings[key] ?? defaultValue
    }
  })

  // Middleware for automatic tenant isolation
  server.addHook('onRequest', async (request, reply) => {
    // Add tenant ID to query logs
    if (request.tenantId) {
      request.log = request.log.child({ tenantId: request.tenantId })
    }
  })

  // Tenant subdomain resolution
  server.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host
    if (!host || !host.includes('.')) {
      return
    }

    const subdomain = host.split('.')[0]
    if (['www', 'api', 'app'].includes(subdomain)) {
      return
    }

    // Try to resolve subdomain to tenant
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { subdomain },
        select: { id: true, status: true },
      })

      if (tenant && tenant.status === 'ACTIVE') {
        // Set tenant ID in request headers for later processing
        request.headers['x-tenant-id'] = tenant.id
      }
    } catch (error) {
      // Ignore subdomain resolution errors
      server.log.debug({ subdomain, error }, 'Subdomain resolution failed')
    }
  })

  server.log.info('✅ Tenant plugin registered successfully')
})

// Extend FastifyRequest interface
declare module 'fastify' {
  interface FastifyRequest {
    requireFeature: (feature: string) => void
    checkLimit: (resource: string) => Promise<any>
    getTenantSetting: (key: string, defaultValue?: any) => any
  }
}