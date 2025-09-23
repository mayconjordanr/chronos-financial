"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const email_1 = require("../../utils/email");
class AuthService {
    prisma;
    redis;
    JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
    ACCESS_TOKEN_EXPIRY = '15m';
    REFRESH_TOKEN_EXPIRY = '7d';
    MAGIC_LINK_EXPIRY = 15 * 60;
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async sendMagicLink(email, tenantId) {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    email,
                    tenantId,
                    isActive: true
                }
            });
            if (!user) {
                return {
                    success: false,
                    message: 'User not found in this tenant'
                };
            }
            const token = (0, uuid_1.v4)();
            const magicLinkKey = `magic_link:${tenantId}:${email}`;
            await this.redis.setEx(magicLinkKey, this.MAGIC_LINK_EXPIRY, JSON.stringify({
                token,
                userId: user.id,
                tenantId,
                email,
                createdAt: new Date().toISOString()
            }));
            await (0, email_1.sendMagicLinkEmail)(email, token, tenantId);
            return {
                success: true,
                message: 'Magic link sent successfully'
            };
        }
        catch (error) {
            console.error('Error sending magic link:', error);
            return {
                success: false,
                message: 'Failed to send magic link'
            };
        }
    }
    async verifyMagicLink(token, tenantId) {
        try {
            const keys = await this.redis.keys(`magic_link:${tenantId}:*`);
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    const magicLinkData = JSON.parse(data);
                    if (magicLinkData.token === token) {
                        const user = await this.prisma.user.findFirst({
                            where: {
                                id: magicLinkData.userId,
                                tenantId,
                                isActive: true
                            }
                        });
                        if (!user) {
                            return {
                                success: false,
                                message: 'User not found or inactive'
                            };
                        }
                        await this.redis.del(key);
                        const tokens = await this.generateTokens(user);
                        const sessionId = (0, uuid_1.v4)();
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
        }
        catch (error) {
            console.error('Error verifying magic link:', error);
            return {
                success: false,
                message: 'Failed to verify magic link'
            };
        }
    }
    async generateTokens(user) {
        const payload = {
            userId: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role || 'user'
        };
        const accessToken = jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRY
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, this.JWT_REFRESH_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRY
        });
        const refreshKey = `refresh_token:${user.tenantId}:${user.id}`;
        await this.redis.setEx(refreshKey, 7 * 24 * 60 * 60, refreshToken);
        return {
            accessToken,
            refreshToken
        };
    }
    verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    async refreshTokens(refreshToken, tenantId) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, this.JWT_REFRESH_SECRET);
            if (decoded.tenantId !== tenantId) {
                return {
                    success: false,
                    message: 'Invalid refresh token'
                };
            }
            const refreshKey = `refresh_token:${tenantId}:${decoded.userId}`;
            const storedToken = await this.redis.get(refreshKey);
            if (storedToken !== refreshToken) {
                return {
                    success: false,
                    message: 'Invalid refresh token'
                };
            }
            const user = await this.prisma.user.findFirst({
                where: {
                    id: decoded.userId,
                    tenantId,
                    isActive: true
                }
            });
            if (!user) {
                return {
                    success: false,
                    message: 'User not found or inactive'
                };
            }
            const newTokens = await this.generateTokens(user);
            await this.redis.del(refreshKey);
            return {
                success: true,
                message: 'Tokens refreshed successfully',
                tokens: newTokens
            };
        }
        catch (error) {
            return {
                success: false,
                message: 'Invalid refresh token'
            };
        }
    }
    async createSession(sessionId, sessionData) {
        const sessionKey = `session:${sessionData.tenantId}:${sessionData.userId}:${sessionId}`;
        await this.redis.setEx(sessionKey, 24 * 60 * 60, JSON.stringify(sessionData));
    }
    async getSession(sessionId, tenantId) {
        try {
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
            if (parsed.tenantId !== tenantId) {
                return null;
            }
            return parsed;
        }
        catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }
    async invalidateSession(sessionId, tenantId) {
        const pattern = `session:${tenantId}:*:${sessionId}`;
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            await this.redis.del(key);
        }
    }
    async invalidateAllUserSessions(userId, tenantId) {
        const pattern = `session:${tenantId}:${userId}:*`;
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            await this.redis.del(key);
        }
    }
    async findUserByEmail(email, tenantId) {
        return this.prisma.user.findFirst({
            where: {
                email,
                tenantId,
                isActive: true
            }
        });
    }
    async getCurrentUser(userId, tenantId) {
        return this.prisma.user.findFirst({
            where: {
                id: userId,
                tenantId,
                isActive: true
            }
        });
    }
    async updateUserProfile(userId, tenantId, data) {
        try {
            const updatedUser = await this.prisma.user.update({
                where: {
                    id: userId,
                    tenantId
                },
                data
            });
            return updatedUser;
        }
        catch (error) {
            console.error('Error updating user profile:', error);
            return null;
        }
    }
    async logout(userId, tenantId, sessionId) {
        const refreshKey = `refresh_token:${tenantId}:${userId}`;
        await this.redis.del(refreshKey);
        if (sessionId) {
            await this.invalidateSession(sessionId, tenantId);
        }
        else {
            await this.invalidateAllUserSessions(userId, tenantId);
        }
    }
    async deleteAccount(userId, tenantId) {
        try {
            await this.prisma.user.update({
                where: {
                    id: userId,
                    tenantId
                },
                data: {
                    isActive: false,
                    deletedAt: new Date()
                }
            });
            await this.logout(userId, tenantId);
            return true;
        }
        catch (error) {
            console.error('Error deleting account:', error);
            return false;
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map