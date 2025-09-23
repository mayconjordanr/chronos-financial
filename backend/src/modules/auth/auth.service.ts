import { PrismaClient, User } from '@prisma/client';
import { Redis } from 'redis';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { sendMagicLinkEmail } from '../../utils/email';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  loginTime: Date;
}

export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: User;
  tokens?: AuthTokens;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly MAGIC_LINK_EXPIRY = 15 * 60; // 15 minutes in seconds

  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  async sendMagicLink(email: string, tenantId: string): Promise<AuthResult> {
    try {
      // CRITICAL: Always include tenantId in query
      const user = await this.prisma.user.findFirst({
        where: {
          email,
          tenantId, // CRITICAL: Tenant isolation
          isActive: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found in this tenant'
        };
      }

      // Generate secure magic link token
      const token = uuidv4();
      const magicLinkKey = `magic_link:${tenantId}:${email}`;

      // Store token in Redis with expiration
      await this.redis.setEx(magicLinkKey, this.MAGIC_LINK_EXPIRY, JSON.stringify({
        token,
        userId: user.id,
        tenantId,
        email,
        createdAt: new Date().toISOString()
      }));

      // Send email with magic link
      await sendMagicLinkEmail(email, token, tenantId);

      return {
        success: true,
        message: 'Magic link sent successfully'
      };
    } catch (error) {
      console.error('Error sending magic link:', error);
      return {
        success: false,
        message: 'Failed to send magic link'
      };
    }
  }

  async verifyMagicLink(token: string, tenantId: string): Promise<AuthResult> {
    try {
      // Find magic link token in Redis
      const keys = await this.redis.keys(`magic_link:${tenantId}:*`);

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const magicLinkData = JSON.parse(data);

          if (magicLinkData.token === token) {
            // Token found, validate user still exists
            const user = await this.prisma.user.findFirst({
              where: {
                id: magicLinkData.userId,
                tenantId, // CRITICAL: Tenant isolation
                isActive: true
              }
            });

            if (!user) {
              return {
                success: false,
                message: 'User not found or inactive'
              };
            }

            // Delete the magic link token (single use)
            await this.redis.del(key);

            // Generate JWT tokens
            const tokens = await this.generateTokens(user);

            // Create session
            const sessionId = uuidv4();
            await this.createSession(sessionId, {
              userId: user.id,
              tenantId: user.tenantId,
              email: user.email,
              loginTime: new Date()
            });

            return {
              success: true,
              message: 'Authentication successful',
              user,
              tokens
            };
          }
        }
      }

      return {
        success: false,
        message: 'Invalid or expired magic link'
      };
    } catch (error) {
      console.error('Error verifying magic link:', error);
      return {
        success: false,
        message: 'Failed to verify magic link'
      };
    }
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      tenantId: user.tenantId, // CRITICAL: Include tenant context
      email: user.email,
      role: user.role || 'user'
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    });

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY
    });

    // Store refresh token in Redis
    const refreshKey = `refresh_token:${user.tenantId}:${user.id}`;
    await this.redis.setEx(refreshKey, 7 * 24 * 60 * 60, refreshToken); // 7 days

    return {
      accessToken,
      refreshToken
    };
  }

  verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  async refreshTokens(refreshToken: string, tenantId: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as JWTPayload;

      // CRITICAL: Verify tenant context matches
      if (decoded.tenantId !== tenantId) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Verify refresh token exists in Redis
      const refreshKey = `refresh_token:${tenantId}:${decoded.userId}`;
      const storedToken = await this.redis.get(refreshKey);

      if (storedToken !== refreshToken) {
        return {
          success: false,
          message: 'Invalid refresh token'
        };
      }

      // Get current user data
      const user = await this.prisma.user.findFirst({
        where: {
          id: decoded.userId,
          tenantId, // CRITICAL: Tenant isolation
          isActive: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found or inactive'
        };
      }

      // Generate new tokens
      const newTokens = await this.generateTokens(user);

      // Invalidate old refresh token
      await this.redis.del(refreshKey);

      return {
        success: true,
        message: 'Tokens refreshed successfully',
        tokens: newTokens
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid refresh token'
      };
    }
  }

  async createSession(sessionId: string, sessionData: SessionData): Promise<void> {
    const sessionKey = `session:${sessionData.tenantId}:${sessionData.userId}:${sessionId}`;

    await this.redis.setEx(
      sessionKey,
      24 * 60 * 60, // 24 hours
      JSON.stringify(sessionData)
    );
  }

  async getSession(sessionId: string, tenantId: string): Promise<SessionData | null> {
    try {
      // Find session key that matches the pattern
      const pattern = `session:${tenantId}:*:${sessionId}`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return null;
      }

      const sessionData = await this.redis.get(keys[0]);
      if (!sessionData) {
        return null;
      }

      const parsed = JSON.parse(sessionData);

      // CRITICAL: Verify tenant context
      if (parsed.tenantId !== tenantId) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async invalidateSession(sessionId: string, tenantId: string): Promise<void> {
    const pattern = `session:${tenantId}:*:${sessionId}`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      await this.redis.del(key);
    }
  }

  async invalidateAllUserSessions(userId: string, tenantId: string): Promise<void> {
    const pattern = `session:${tenantId}:${userId}:*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      await this.redis.del(key);
    }
  }

  async findUserByEmail(email: string, tenantId: string): Promise<User | null> {
    // CRITICAL: Always include tenantId in query
    return this.prisma.user.findFirst({
      where: {
        email,
        tenantId, // CRITICAL: Tenant isolation
        isActive: true
      }
    });
  }

  async getCurrentUser(userId: string, tenantId: string): Promise<User | null> {
    // CRITICAL: Always include tenantId in query
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // CRITICAL: Tenant isolation
        isActive: true
      }
    });
  }

  async updateUserProfile(userId: string, tenantId: string, data: Partial<User>): Promise<User | null> {
    try {
      // CRITICAL: Always include tenantId in query
      const updatedUser = await this.prisma.user.update({
        where: {
          id: userId,
          tenantId // CRITICAL: Tenant isolation
        },
        data
      });

      return updatedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  }

  async logout(userId: string, tenantId: string, sessionId?: string): Promise<void> {
    // Invalidate refresh tokens
    const refreshKey = `refresh_token:${tenantId}:${userId}`;
    await this.redis.del(refreshKey);

    // Invalidate sessions
    if (sessionId) {
      await this.invalidateSession(sessionId, tenantId);
    } else {
      await this.invalidateAllUserSessions(userId, tenantId);
    }
  }

  async deleteAccount(userId: string, tenantId: string): Promise<boolean> {
    try {
      // CRITICAL: Always include tenantId in query
      await this.prisma.user.update({
        where: {
          id: userId,
          tenantId // CRITICAL: Tenant isolation
        },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });

      // Clean up all sessions and tokens
      await this.logout(userId, tenantId);

      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  }
}