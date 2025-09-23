import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { createRedisClient } from '../../config/redis';
import { v4 as uuidv4 } from 'uuid';

describe('Multi-Tenant Isolation Tests', () => {
  let authService: AuthService;
  let prisma: PrismaClient;
  let redis: any;
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    redis = createRedisClient();
    await redis.connect();

    authService = new AuthService(prisma, redis);

    // Create two separate tenants
    tenant1Id = uuidv4();
    tenant2Id = uuidv4();
    user1Id = uuidv4();
    user2Id = uuidv4();

    await prisma.tenant.createMany({
      data: [
        {
          id: tenant1Id,
          name: 'Tenant One',
          slug: `tenant1-${Date.now()}`,
          status: 'ACTIVE'
        },
        {
          id: tenant2Id,
          name: 'Tenant Two',
          slug: `tenant2-${Date.now()}`,
          status: 'ACTIVE'
        }
      ]
    });

    // Create users in both tenants with same email
    await prisma.user.createMany({
      data: [
        {
          id: user1Id,
          tenantId: tenant1Id,
          email: 'shared@example.com',
          firstName: 'User',
          lastName: 'One',
          password: 'hashedpassword1',
          isActive: true
        },
        {
          id: user2Id,
          tenantId: tenant2Id,
          email: 'shared@example.com',
          firstName: 'User',
          lastName: 'Two',
          password: 'hashedpassword2',
          isActive: true
        }
      ]
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        tenantId: { in: [tenant1Id, tenant2Id] }
      }
    });
    await prisma.tenant.deleteMany({
      where: {
        id: { in: [tenant1Id, tenant2Id] }
      }
    });
    await redis.flushall();
    await redis.disconnect();
    await prisma.$disconnect();
  });

  describe('User Isolation by Tenant', () => {
    it('should return correct user for each tenant with same email', async () => {
      const user1 = await authService.findUserByEmail('shared@example.com', tenant1Id);
      const user2 = await authService.findUserByEmail('shared@example.com', tenant2Id);

      expect(user1).toBeTruthy();
      expect(user2).toBeTruthy();
      expect(user1?.id).toBe(user1Id);
      expect(user2?.id).toBe(user2Id);
      expect(user1?.tenantId).toBe(tenant1Id);
      expect(user2?.tenantId).toBe(tenant2Id);
      expect(user1?.firstName).toBe('User');
      expect(user1?.lastName).toBe('One');
      expect(user2?.firstName).toBe('User');
      expect(user2?.lastName).toBe('Two');
    });

    it('should not find user from wrong tenant', async () => {
      // Try to find tenant1 user with tenant2 context
      const user = await authService.findUserByEmail('shared@example.com', uuidv4());
      expect(user).toBeNull();
    });

    it('should isolate getCurrentUser by tenant', async () => {
      const user1 = await authService.getCurrentUser(user1Id, tenant1Id);
      const user2 = await authService.getCurrentUser(user2Id, tenant2Id);

      // Should find correct users
      expect(user1?.id).toBe(user1Id);
      expect(user2?.id).toBe(user2Id);

      // Should not find users from wrong tenant
      const wrongTenant1 = await authService.getCurrentUser(user1Id, tenant2Id);
      const wrongTenant2 = await authService.getCurrentUser(user2Id, tenant1Id);

      expect(wrongTenant1).toBeNull();
      expect(wrongTenant2).toBeNull();
    });
  });

  describe('Magic Link Isolation', () => {
    it('should isolate magic links by tenant', async () => {
      // Send magic links for same email in both tenants
      const result1 = await authService.sendMagicLink('shared@example.com', tenant1Id);
      const result2 = await authService.sendMagicLink('shared@example.com', tenant2Id);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify separate magic link tokens exist
      const token1 = await redis.get(`magic_link:${tenant1Id}:shared@example.com`);
      const token2 = await redis.get(`magic_link:${tenant2Id}:shared@example.com`);

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();

      const data1 = JSON.parse(token1);
      const data2 = JSON.parse(token2);

      expect(data1.tenantId).toBe(tenant1Id);
      expect(data2.tenantId).toBe(tenant2Id);
      expect(data1.userId).toBe(user1Id);
      expect(data2.userId).toBe(user2Id);
    });

    it('should verify magic link only for correct tenant', async () => {
      // Send magic link for tenant1
      await authService.sendMagicLink('shared@example.com', tenant1Id);

      const token1Data = await redis.get(`magic_link:${tenant1Id}:shared@example.com`);
      const { token } = JSON.parse(token1Data);

      // Should verify successfully for correct tenant
      const result1 = await authService.verifyMagicLink(token, tenant1Id);
      expect(result1.success).toBe(true);
      expect(result1.user?.tenantId).toBe(tenant1Id);

      // Should fail for wrong tenant
      const result2 = await authService.verifyMagicLink(token, tenant2Id);
      expect(result2.success).toBe(false);
    });
  });

  describe('JWT Token Isolation', () => {
    it('should include tenant context in JWT tokens', async () => {
      const user1 = await prisma.user.findFirst({
        where: { id: user1Id, tenantId: tenant1Id }
      });

      const user2 = await prisma.user.findFirst({
        where: { id: user2Id, tenantId: tenant2Id }
      });

      const tokens1 = await authService.generateTokens(user1!);
      const tokens2 = await authService.generateTokens(user2!);

      const decoded1 = authService.verifyAccessToken(tokens1.accessToken);
      const decoded2 = authService.verifyAccessToken(tokens2.accessToken);

      expect(decoded1?.tenantId).toBe(tenant1Id);
      expect(decoded2?.tenantId).toBe(tenant2Id);
      expect(decoded1?.userId).toBe(user1Id);
      expect(decoded2?.userId).toBe(user2Id);
    });

    it('should reject refresh tokens from wrong tenant', async () => {
      const user1 = await prisma.user.findFirst({
        where: { id: user1Id, tenantId: tenant1Id }
      });

      const tokens = await authService.generateTokens(user1!);

      // Should refresh successfully with correct tenant
      const result1 = await authService.refreshTokens(tokens.refreshToken, tenant1Id);
      expect(result1.success).toBe(true);

      // Should fail with wrong tenant
      const result2 = await authService.refreshTokens(tokens.refreshToken, tenant2Id);
      expect(result2.success).toBe(false);
      expect(result2.message).toBe('Invalid refresh token');
    });
  });

  describe('Session Isolation', () => {
    it('should isolate sessions by tenant', async () => {
      const sessionId1 = uuidv4();
      const sessionId2 = uuidv4();

      const sessionData1 = {
        userId: user1Id,
        tenantId: tenant1Id,
        email: 'shared@example.com',
        loginTime: new Date()
      };

      const sessionData2 = {
        userId: user2Id,
        tenantId: tenant2Id,
        email: 'shared@example.com',
        loginTime: new Date()
      };

      await authService.createSession(sessionId1, sessionData1);
      await authService.createSession(sessionId2, sessionData2);

      // Should retrieve correct sessions
      const retrievedSession1 = await authService.getSession(sessionId1, tenant1Id);
      const retrievedSession2 = await authService.getSession(sessionId2, tenant2Id);

      expect(retrievedSession1?.tenantId).toBe(tenant1Id);
      expect(retrievedSession2?.tenantId).toBe(tenant2Id);

      // Should not retrieve sessions from wrong tenant
      const wrongSession1 = await authService.getSession(sessionId1, tenant2Id);
      const wrongSession2 = await authService.getSession(sessionId2, tenant1Id);

      expect(wrongSession1).toBeNull();
      expect(wrongSession2).toBeNull();
    });

    it('should invalidate sessions only for correct tenant', async () => {
      const sessionId = uuidv4();
      const sessionData = {
        userId: user1Id,
        tenantId: tenant1Id,
        email: 'shared@example.com',
        loginTime: new Date()
      };

      await authService.createSession(sessionId, sessionData);

      // Verify session exists
      const session = await authService.getSession(sessionId, tenant1Id);
      expect(session).toBeTruthy();

      // Try to invalidate with wrong tenant (should not work)
      await authService.invalidateSession(sessionId, tenant2Id);

      // Session should still exist
      const stillExists = await authService.getSession(sessionId, tenant1Id);
      expect(stillExists).toBeTruthy();

      // Invalidate with correct tenant
      await authService.invalidateSession(sessionId, tenant1Id);

      // Session should be gone
      const shouldBeNull = await authService.getSession(sessionId, tenant1Id);
      expect(shouldBeNull).toBeNull();
    });
  });

  describe('Profile Updates Isolation', () => {
    it('should update profile only for correct tenant', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      // Should update successfully for correct tenant
      const updated1 = await authService.updateUserProfile(user1Id, tenant1Id, updateData);
      expect(updated1?.firstName).toBe('Updated');
      expect(updated1?.lastName).toBe('Name');

      // Should not update for wrong tenant
      const updated2 = await authService.updateUserProfile(user1Id, tenant2Id, updateData);
      expect(updated2).toBeNull();

      // Verify user in tenant2 was not affected
      const user2 = await authService.getCurrentUser(user2Id, tenant2Id);
      expect(user2?.firstName).toBe('User');
      expect(user2?.lastName).toBe('Two');
    });
  });

  describe('Account Deletion Isolation', () => {
    it('should delete account only for correct tenant', async () => {
      // Should fail to delete with wrong tenant
      const deleted1 = await authService.deleteAccount(user1Id, tenant2Id);
      expect(deleted1).toBe(false);

      // User should still exist
      const stillExists = await authService.getCurrentUser(user1Id, tenant1Id);
      expect(stillExists).toBeTruthy();
      expect(stillExists?.isActive).toBe(true);

      // Should delete successfully with correct tenant
      const deleted2 = await authService.deleteAccount(user1Id, tenant1Id);
      expect(deleted2).toBe(true);

      // User should be marked as inactive
      const user = await prisma.user.findFirst({
        where: { id: user1Id, tenantId: tenant1Id }
      });
      expect(user?.isActive).toBe(false);
      expect(user?.deletedAt).toBeTruthy();
    });
  });

  describe('Cross-Tenant Attack Prevention', () => {
    it('should prevent all cross-tenant operations', async () => {
      const attackTenantId = uuidv4();

      // All operations should fail with non-existent tenant
      const findUser = await authService.findUserByEmail('shared@example.com', attackTenantId);
      expect(findUser).toBeNull();

      const getCurrentUser = await authService.getCurrentUser(user1Id, attackTenantId);
      expect(getCurrentUser).toBeNull();

      const updateProfile = await authService.updateUserProfile(user1Id, attackTenantId, {
        firstName: 'Hacked'
      });
      expect(updateProfile).toBeNull();

      const deleteAccount = await authService.deleteAccount(user1Id, attackTenantId);
      expect(deleteAccount).toBe(false);

      const getSession = await authService.getSession(uuidv4(), attackTenantId);
      expect(getSession).toBeNull();

      // Original users should be unaffected
      const user1 = await authService.getCurrentUser(user1Id, tenant1Id);
      const user2 = await authService.getCurrentUser(user2Id, tenant2Id);

      expect(user1).toBeTruthy();
      expect(user2).toBeTruthy();
      expect(user1?.firstName).toBe('User');
      expect(user2?.firstName).toBe('User');
    });
  });
});