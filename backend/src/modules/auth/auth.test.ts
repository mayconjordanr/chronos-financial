import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { createRedisClient } from '../../config/redis';
import { v4 as uuidv4 } from 'uuid';

describe('Authentication Module', () => {
  let authService: AuthService;
  let prisma: PrismaClient;
  let redis: any;
  let testTenantId: string;
  let testUserId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    redis = createRedisClient();
    await redis.connect();

    authService = new AuthService(prisma, redis);
    testTenantId = uuidv4();
    testUserId = uuidv4();

    // Create test tenant
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: 'Test Tenant',
        slug: `test-${Date.now()}`,
        status: 'ACTIVE'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    await redis.flushall();
    await redis.disconnect();
    await prisma.$disconnect();
  });

  describe('Magic Link Authentication', () => {
    it('should send magic link email for valid user', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: testUserId,
          tenantId: testTenantId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });

      const result = await authService.sendMagicLink(user.email, testTenantId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Magic link sent successfully');

      // Verify magic link token is stored in Redis
      const storedToken = await redis.get(`magic_link:${testTenantId}:${user.email}`);
      expect(storedToken).toBeTruthy();
    });

    it('should reject magic link for user from different tenant', async () => {
      const wrongTenantId = uuidv4();

      // Create user in different tenant
      await prisma.tenant.create({
        data: {
          id: wrongTenantId,
          name: 'Wrong Tenant',
          slug: `wrong-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          tenantId: wrongTenantId,
          email: 'wrong@example.com',
          firstName: 'Wrong',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });

      // Try to send magic link with original tenant ID
      const result = await authService.sendMagicLink(user.email, testTenantId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found in this tenant');

      // Cleanup
      await prisma.user.deleteMany({ where: { tenantId: wrongTenantId } });
      await prisma.tenant.deleteMany({ where: { id: wrongTenantId } });
    });

    it('should verify valid magic link token', async () => {
      const user = await prisma.user.create({
        data: {
          id: testUserId,
          tenantId: testTenantId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });

      // Send magic link first
      await authService.sendMagicLink(user.email, testTenantId);

      // Get the token from Redis
      const token = await redis.get(`magic_link:${testTenantId}:${user.email}`);

      const result = await authService.verifyMagicLink(token, testTenantId);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.tenantId).toBe(testTenantId);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBeTruthy();
      expect(result.tokens?.refreshToken).toBeTruthy();
    });

    it('should reject expired magic link token', async () => {
      const expiredToken = 'expired_token_123';

      const result = await authService.verifyMagicLink(expiredToken, testTenantId);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired magic link');
    });
  });

  describe('JWT Token Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          id: testUserId,
          tenantId: testTenantId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });
    });

    it('should generate JWT tokens with tenant context', async () => {
      const tokens = await authService.generateTokens(testUser);

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();

      // Decode and verify token contains tenant context
      const decoded = authService.verifyAccessToken(tokens.accessToken);
      expect(decoded.tenantId).toBe(testTenantId);
      expect(decoded.userId).toBe(testUserId);
    });

    it('should refresh tokens with valid refresh token', async () => {
      const initialTokens = await authService.generateTokens(testUser);

      // Wait a moment to ensure new tokens have different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));

      const refreshResult = await authService.refreshTokens(initialTokens.refreshToken, testTenantId);

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.tokens).toBeDefined();
      expect(refreshResult.tokens?.accessToken).not.toBe(initialTokens.accessToken);
      expect(refreshResult.tokens?.refreshToken).not.toBe(initialTokens.refreshToken);
    });

    it('should reject refresh token from different tenant', async () => {
      const tokens = await authService.generateTokens(testUser);
      const wrongTenantId = uuidv4();

      const refreshResult = await authService.refreshTokens(tokens.refreshToken, wrongTenantId);

      expect(refreshResult.success).toBe(false);
      expect(refreshResult.message).toBe('Invalid refresh token');
    });
  });

  describe('Session Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          id: testUserId,
          tenantId: testTenantId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });
    });

    it('should create session with tenant isolation', async () => {
      const sessionId = uuidv4();
      const sessionData = {
        userId: testUserId,
        tenantId: testTenantId,
        email: testUser.email,
        loginTime: new Date()
      };

      await authService.createSession(sessionId, sessionData);

      const retrievedSession = await authService.getSession(sessionId, testTenantId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.tenantId).toBe(testTenantId);
      expect(retrievedSession?.userId).toBe(testUserId);
    });

    it('should not retrieve session from different tenant', async () => {
      const sessionId = uuidv4();
      const sessionData = {
        userId: testUserId,
        tenantId: testTenantId,
        email: testUser.email,
        loginTime: new Date()
      };

      await authService.createSession(sessionId, sessionData);

      const wrongTenantId = uuidv4();
      const retrievedSession = await authService.getSession(sessionId, wrongTenantId);
      expect(retrievedSession).toBeNull();
    });

    it('should invalidate session on logout', async () => {
      const sessionId = uuidv4();
      const sessionData = {
        userId: testUserId,
        tenantId: testTenantId,
        email: testUser.email,
        loginTime: new Date()
      };

      await authService.createSession(sessionId, sessionData);
      await authService.invalidateSession(sessionId, testTenantId);

      const retrievedSession = await authService.getSession(sessionId, testTenantId);
      expect(retrievedSession).toBeNull();
    });
  });

  describe('Multi-Tenant User Isolation', () => {
    it('should isolate users by tenant in all operations', async () => {
      // Create two different tenants
      const tenant1Id = testTenantId;
      const tenant2Id = uuidv4();

      await prisma.tenant.create({
        data: {
          id: tenant2Id,
          name: 'Tenant 2',
          slug: `tenant2-${Date.now()}`,
          status: 'ACTIVE'
        }
      });

      // Create users in both tenants with same email
      const user1 = await prisma.user.create({
        data: {
          id: uuidv4(),
          tenantId: tenant1Id,
          email: 'shared@example.com',
          firstName: 'User',
          lastName: 'One',
          password: 'hashedpassword',
          isActive: true
        }
      });

      const user2 = await prisma.user.create({
        data: {
          id: uuidv4(),
          tenantId: tenant2Id,
          email: 'shared@example.com',
          firstName: 'User',
          lastName: 'Two',
          password: 'hashedpassword',
          isActive: true
        }
      });

      // Test that each tenant only sees their own user
      const foundUser1 = await authService.findUserByEmail('shared@example.com', tenant1Id);
      const foundUser2 = await authService.findUserByEmail('shared@example.com', tenant2Id);

      expect(foundUser1?.id).toBe(user1.id);
      expect(foundUser1?.tenantId).toBe(tenant1Id);

      expect(foundUser2?.id).toBe(user2.id);
      expect(foundUser2?.tenantId).toBe(tenant2Id);

      // Cleanup
      await prisma.user.deleteMany({ where: { tenantId: tenant2Id } });
      await prisma.tenant.deleteMany({ where: { id: tenant2Id } });
    });

    it('should prevent cross-tenant user access', async () => {
      const user = await prisma.user.create({
        data: {
          id: testUserId,
          tenantId: testTenantId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'hashedpassword',
          isActive: true
        }
      });

      const wrongTenantId = uuidv4();

      // Try to access user from wrong tenant
      const foundUser = await authService.findUserByEmail(user.email, wrongTenantId);
      expect(foundUser).toBeNull();
    });
  });
});