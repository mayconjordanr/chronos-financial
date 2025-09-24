import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import jwt from '@fastify/jwt'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { config } from '../config/env.js'

// JWT Payload interface
export interface JWTPayload {
  userId: string
  tenantId: string
  role: string
  sessionId: string
  iat?: number
  exp?: number
}

// Authenticated user context
export interface AuthUser {
  id: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  role: string
  sessionId: string
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
    tenantId?: string
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    generateTokens: (user: AuthUser) => Promise<{ accessToken: string; refreshToken: string }>
    hashPassword: (password: string) => Promise<string>
    verifyPassword: (password: string, hash: string) => Promise<boolean>
  }
}

export const authPlugin = fastifyPlugin(async (server: FastifyInstance) => {
  // Register JWT plugin
  await server.register(jwt, {
    secret: config.jwt.secret,
    sign: {
      expiresIn: config.jwt.expiresIn,
    },
    verify: {
      maxAge: config.jwt.expiresIn,
    },
    messages: {
      badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
      noAuthorizationInHeaderMessage: 'Authorization header is missing',
      authorizationTokenExpiredMessage: 'Authorization token expired',
      authorizationTokenInvalid: 'Authorization token is invalid',
    },
  })

  // Authentication decorator
  server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Authorization header missing or invalid format')
      }

      const token = authHeader.slice(7) // Remove 'Bearer ' prefix

      // Verify JWT token
      let payload: JWTPayload
      try {
        payload = server.jwt.verify(token) as JWTPayload
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('expired')) {
            throw server.httpErrors.unauthorized('Token expired')
          }
          if (error.message.includes('invalid')) {
            throw server.httpErrors.unauthorized('Invalid token')
          }
        }
        throw server.httpErrors.unauthorized('Token verification failed')
      }

      // Validate session in database
      const session = await prisma.userSession.findUnique({
        where: {
          id: payload.sessionId,
          isActive: true,
        },
        include: {
          user: {
            include: {
              tenant: true,
            },
          },
        },
      })

      if (!session) {
        throw server.httpErrors.unauthorized('Session not found or inactive')
      }

      if (session.expiresAt < new Date()) {
        // Mark session as inactive
        await prisma.userSession.update({
          where: { id: session.id },
          data: { isActive: false },
        })
        throw server.httpErrors.unauthorized('Session expired')
      }

      // Check user status
      if (session.user.status !== 'ACTIVE') {
        throw server.httpErrors.forbidden('User account is not active')
      }

      // Check tenant status
      if (session.user.tenant.status !== 'ACTIVE') {
        throw server.httpErrors.forbidden('Tenant account is not active')
      }

      // Update session last used
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      })

      // Set user context
      request.user = {
        id: session.user.id,
        tenantId: session.user.tenantId,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        sessionId: session.id,
      }

      request.tenantId = session.user.tenantId

    } catch (error) {
      server.log.error({ error, url: request.url }, 'Authentication failed')

      if (error.statusCode) {
        throw error
      }

      throw server.httpErrors.unauthorized('Authentication failed')
    }
  })

  // Token generation decorator
  server.decorate('generateTokens', async (user: AuthUser) => {
    // Create new session
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        token: '', // Will be updated after JWT generation
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true,
      },
    })

    // Generate JWT tokens
    const jwtPayload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      sessionId: session.id,
    }

    const accessToken = server.jwt.sign(jwtPayload)
    const refreshToken = server.jwt.sign(jwtPayload, { expiresIn: config.jwt.refreshExpiresIn })

    // Update session with tokens
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        token: accessToken,
        refreshToken: refreshToken,
      },
    })

    return { accessToken, refreshToken }
  })

  // Password hashing decorator
  server.decorate('hashPassword', async (password: string): Promise<string> => {
    return bcrypt.hash(password, config.security.bcryptRounds)
  })

  // Password verification decorator
  server.decorate('verifyPassword', async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash)
  })

  // Role-based authorization hook
  server.addHook('onRequest', async (request, reply) => {
    // Add method to check user roles
    request.requireRole = (roles: string | string[]) => {
      if (!request.user) {
        throw server.httpErrors.unauthorized('Authentication required')
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles]

      if (!allowedRoles.includes(request.user.role)) {
        throw server.httpErrors.forbidden(`Required role: ${allowedRoles.join(' or ')}`)
      }
    }

    // Add method to check if user is owner/admin
    request.requireOwnerOrAdmin = () => {
      request.requireRole(['OWNER', 'ADMIN'])
    }

    // Add method to check if user can access resource
    request.canAccessTenant = (tenantId: string): boolean => {
      return request.user?.tenantId === tenantId
    }
  })

  // Logout utility
  server.decorate('logout', async (sessionId: string) => {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    })
  })

  // Logout all sessions for user
  server.decorate('logoutAllSessions', async (userId: string, exceptSessionId?: string) => {
    const where: any = {
      userId,
      isActive: true,
    }

    if (exceptSessionId) {
      where.id = { not: exceptSessionId }
    }

    await prisma.userSession.updateMany({
      where,
      data: { isActive: false },
    })
  })

  // Refresh token utility
  server.decorate('refreshTokens', async (refreshToken: string) => {
    try {
      const payload = server.jwt.verify(refreshToken) as JWTPayload

      // Find session
      const session = await prisma.userSession.findFirst({
        where: {
          id: payload.sessionId,
          refreshToken,
          isActive: true,
        },
        include: {
          user: {
            include: { tenant: true },
          },
        },
      })

      if (!session) {
        throw new Error('Invalid refresh token')
      }

      if (session.refreshExpiresAt && session.refreshExpiresAt < new Date()) {
        // Mark session as inactive
        await prisma.userSession.update({
          where: { id: session.id },
          data: { isActive: false },
        })
        throw new Error('Refresh token expired')
      }

      // Generate new tokens
      const user: AuthUser = {
        id: session.user.id,
        tenantId: session.user.tenantId,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role,
        sessionId: session.id,
      }

      return server.generateTokens(user)
    } catch (error) {
      throw server.httpErrors.unauthorized('Invalid refresh token')
    }
  })

  server.log.info('✅ Auth plugin registered successfully')
})

// Extend FastifyRequest interface
declare module 'fastify' {
  interface FastifyRequest {
    requireRole: (roles: string | string[]) => void
    requireOwnerOrAdmin: () => void
    canAccessTenant: (tenantId: string) => boolean
  }
}