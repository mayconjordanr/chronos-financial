import { FastifyInstance } from 'fastify'
import { Type } from '@sinclair/typebox'
import { prisma } from '../../lib/prisma.js'
import { config } from '../../config/env.js'
import { v4 as uuidv4 } from 'uuid'

// Schema definitions
const LoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
  tenantSlug: Type.Optional(Type.String()),
})

const RegisterSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
  firstName: Type.String({ minLength: 1, maxLength: 50 }),
  lastName: Type.String({ minLength: 1, maxLength: 50 }),
  tenantName: Type.String({ minLength: 1, maxLength: 100 }),
  tenantSlug: Type.Optional(Type.String({ pattern: '^[a-z0-9-]+$' })),
})

const RefreshTokenSchema = Type.Object({
  refreshToken: Type.String(),
})

const ForgotPasswordSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  tenantSlug: Type.Optional(Type.String()),
})

const ResetPasswordSchema = Type.Object({
  token: Type.String(),
  password: Type.String({ minLength: 8 }),
})

const InviteUserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  role: Type.Union([
    Type.Literal('USER'),
    Type.Literal('ADMIN'),
  ]),
})

export async function authRoutes(server: FastifyInstance) {
  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================

  // Login
  server.post('/login', {
    schema: {
      tags: ['Authentication'],
      summary: 'User login',
      body: LoginSchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            user: Type.Object({
              id: Type.String(),
              email: Type.String(),
              firstName: Type.String(),
              lastName: Type.String(),
              role: Type.String(),
              tenantId: Type.String(),
              tenantName: Type.String(),
            }),
            accessToken: Type.String(),
            refreshToken: Type.String(),
          }),
        }),
        400: Type.Object({
          error: Type.String(),
          message: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { email, password, tenantSlug } = request.body

    try {
      // Find user by email
      let user
      if (tenantSlug) {
        // Find user by email and tenant slug
        user = await prisma.user.findFirst({
          where: {
            email,
            tenant: {
              slug: tenantSlug,
            },
          },
          include: {
            tenant: true,
          },
        })
      } else {
        // Find user by email only (for single-tenant setups or first match)
        user = await prisma.user.findFirst({
          where: { email },
          include: {
            tenant: true,
          },
        })
      }

      if (!user || !user.passwordHash) {
        throw server.httpErrors.unauthorized('Invalid credentials')
      }

      // Verify password
      const isValidPassword = await server.verifyPassword(password, user.passwordHash)
      if (!isValidPassword) {
        throw server.httpErrors.unauthorized('Invalid credentials')
      }

      // Check user status
      if (user.status !== 'ACTIVE') {
        throw server.httpErrors.forbidden('Account is not active')
      }

      // Check tenant status
      if (user.tenant.status !== 'ACTIVE') {
        throw server.httpErrors.forbidden('Tenant account is not active')
      }

      // Generate tokens
      const userAuth = {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        sessionId: '', // Will be set by generateTokens
      }

      const { accessToken, refreshToken } = await server.generateTokens(userAuth)

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            tenantId: user.tenantId,
            tenantName: user.tenant.name,
          },
          accessToken,
          refreshToken,
        },
      })

    } catch (error) {
      server.log.error(error, 'Login failed')

      if (error.statusCode) {
        throw error
      }

      throw server.httpErrors.internalServerError('Login failed')
    }
  })

  // Register (create new tenant and owner user)
  server.post('/register', {
    schema: {
      tags: ['Authentication'],
      summary: 'Register new tenant and user',
      body: RegisterSchema,
      response: {
        201: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            user: Type.Object({
              id: Type.String(),
              email: Type.String(),
              firstName: Type.String(),
              lastName: Type.String(),
              role: Type.String(),
              tenantId: Type.String(),
              tenantName: Type.String(),
            }),
            accessToken: Type.String(),
            refreshToken: Type.String(),
          }),
        }),
      },
    },
  }, async (request, reply) => {
    const { email, password, firstName, lastName, tenantName, tenantSlug } = request.body

    try {
      // Generate tenant slug if not provided
      const slug = tenantSlug || tenantName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      // Check if tenant slug is already taken
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug },
      })

      if (existingTenant) {
        throw server.httpErrors.badRequest('Tenant slug is already taken')
      }

      // Check if user email already exists
      const existingUser = await prisma.user.findFirst({
        where: { email },
      })

      if (existingUser) {
        throw server.httpErrors.badRequest('Email is already registered')
      }

      // Hash password
      const passwordHash = await server.hashPassword(password)

      // Create tenant and owner user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: tenantName,
            slug,
            status: 'ACTIVE',
            planType: 'STARTER',
            billingCycle: 'MONTHLY',
            settings: {
              currency: 'USD',
              timezone: 'UTC',
              dateFormat: 'MM/DD/YYYY',
            },
            features: {
              realTimeUpdates: true,
              whatsappIntegration: config.features.whatsappIntegration,
              stripeIntegration: config.features.stripeIntegration,
              analytics: true,
            },
            limits: config.tenant.defaultLimits,
          },
        })

        // Create owner user
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email,
            firstName,
            lastName,
            passwordHash,
            role: 'OWNER',
            status: 'ACTIVE',
            emailVerifiedAt: new Date(), // Auto-verify for demo
          },
        })

        return { tenant, user }
      })

      // Generate tokens
      const userAuth = {
        id: result.user.id,
        tenantId: result.user.tenantId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        sessionId: '',
      }

      const { accessToken, refreshToken } = await server.generateTokens(userAuth)

      return reply.code(201).send({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            tenantId: result.user.tenantId,
            tenantName: result.tenant.name,
          },
          accessToken,
          refreshToken,
        },
      })

    } catch (error) {
      server.log.error(error, 'Registration failed')

      if (error.statusCode) {
        throw error
      }

      throw server.httpErrors.internalServerError('Registration failed')
    }
  })

  // Refresh tokens
  server.post('/refresh', {
    schema: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      body: RefreshTokenSchema,
    },
  }, async (request, reply) => {
    const { refreshToken } = request.body

    try {
      const tokens = await server.refreshTokens(refreshToken)

      return reply.send({
        success: true,
        data: tokens,
      })

    } catch (error) {
      server.log.error(error, 'Token refresh failed')
      throw error
    }
  })

  // Logout
  server.post('/logout', {
    schema: {
      tags: ['Authentication'],
      summary: 'Logout user',
    },
    onRequest: [server.authenticate],
  }, async (request, reply) => {
    try {
      await server.logout(request.user!.sessionId)

      return reply.send({
        success: true,
        message: 'Logged out successfully',
      })

    } catch (error) {
      server.log.error(error, 'Logout failed')
      throw server.httpErrors.internalServerError('Logout failed')
    }
  })

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  // Forgot password
  server.post('/forgot-password', {
    schema: {
      tags: ['Authentication'],
      summary: 'Request password reset',
      body: ForgotPasswordSchema,
    },
  }, async (request, reply) => {
    const { email, tenantSlug } = request.body

    try {
      // Find user
      let user
      if (tenantSlug) {
        user = await prisma.user.findFirst({
          where: {
            email,
            tenant: { slug: tenantSlug },
          },
        })
      } else {
        user = await prisma.user.findFirst({
          where: { email },
        })
      }

      // Always return success for security (don't reveal if email exists)
      if (!user) {
        return reply.send({
          success: true,
          message: 'If the email exists, a reset link will be sent',
        })
      }

      // Generate reset token
      const resetToken = uuidv4()
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store reset token (in a real app, you'd store this in a separate table)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          // Note: In production, store reset tokens in a separate table
          preferences: {
            ...(user.preferences as object || {}),
            resetToken,
            resetTokenExpires: resetTokenExpires.toISOString(),
          },
        },
      })

      // TODO: Send email with reset link
      server.log.info({ userId: user.id, resetToken }, 'Password reset requested')

      return reply.send({
        success: true,
        message: 'If the email exists, a reset link will be sent',
        // In development, return the token for testing
        ...(config.isDevelopment && { resetToken }),
      })

    } catch (error) {
      server.log.error(error, 'Password reset request failed')
      throw server.httpErrors.internalServerError('Password reset request failed')
    }
  })

  // Reset password
  server.post('/reset-password', {
    schema: {
      tags: ['Authentication'],
      summary: 'Reset password with token',
      body: ResetPasswordSchema,
    },
  }, async (request, reply) => {
    const { token, password } = request.body

    try {
      // Find user with reset token
      const user = await prisma.user.findFirst({
        where: {
          preferences: {
            path: ['resetToken'],
            equals: token,
          },
        },
      })

      if (!user) {
        throw server.httpErrors.badRequest('Invalid reset token')
      }

      // Check token expiration
      const preferences = user.preferences as any
      const resetTokenExpires = new Date(preferences.resetTokenExpires)

      if (resetTokenExpires < new Date()) {
        throw server.httpErrors.badRequest('Reset token has expired')
      }

      // Hash new password
      const passwordHash = await server.hashPassword(password)

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          preferences: {
            ...(preferences || {}),
            resetToken: null,
            resetTokenExpires: null,
          },
        },
      })

      // Invalidate all sessions
      await server.logoutAllSessions(user.id)

      return reply.send({
        success: true,
        message: 'Password reset successfully',
      })

    } catch (error) {
      server.log.error(error, 'Password reset failed')

      if (error.statusCode) {
        throw error
      }

      throw server.httpErrors.internalServerError('Password reset failed')
    }
  })

  // ============================================================================
  // USER MANAGEMENT (Authenticated)
  // ============================================================================

  // Get current user profile
  server.get('/profile', {
    schema: {
      tags: ['Authentication'],
      summary: 'Get current user profile',
    },
    onRequest: [server.authenticate],
  }, async (request, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.id },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              planType: true,
              features: true,
            },
          },
        },
      })

      if (!user) {
        throw server.httpErrors.notFound('User not found')
      }

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          language: user.language,
          timezone: user.timezone,
          preferences: user.preferences,
          emailVerifiedAt: user.emailVerifiedAt,
          lastLoginAt: user.lastLoginAt,
          tenant: user.tenant,
        },
      })

    } catch (error) {
      server.log.error(error, 'Get profile failed')
      throw server.httpErrors.internalServerError('Get profile failed')
    }
  })

  server.log.info('✅ Auth routes registered')
}