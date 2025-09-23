import { PrismaClient, User } from '@prisma/client';
import { Redis } from 'redis';
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
export declare class AuthService {
    private prisma;
    private redis;
    private readonly JWT_SECRET;
    private readonly JWT_REFRESH_SECRET;
    private readonly ACCESS_TOKEN_EXPIRY;
    private readonly REFRESH_TOKEN_EXPIRY;
    private readonly MAGIC_LINK_EXPIRY;
    constructor(prisma: PrismaClient, redis: Redis);
    sendMagicLink(email: string, tenantId: string): Promise<AuthResult>;
    verifyMagicLink(token: string, tenantId: string): Promise<AuthResult>;
    generateTokens(user: User): Promise<AuthTokens>;
    verifyAccessToken(token: string): JWTPayload | null;
    refreshTokens(refreshToken: string, tenantId: string): Promise<AuthResult>;
    createSession(sessionId: string, sessionData: SessionData): Promise<void>;
    getSession(sessionId: string, tenantId: string): Promise<SessionData | null>;
    invalidateSession(sessionId: string, tenantId: string): Promise<void>;
    invalidateAllUserSessions(userId: string, tenantId: string): Promise<void>;
    findUserByEmail(email: string, tenantId: string): Promise<User | null>;
    getCurrentUser(userId: string, tenantId: string): Promise<User | null>;
    updateUserProfile(userId: string, tenantId: string, data: Partial<User>): Promise<User | null>;
    logout(userId: string, tenantId: string, sessionId?: string): Promise<void>;
    deleteAccount(userId: string, tenantId: string): Promise<boolean>;
}
//# sourceMappingURL=auth.service.d.ts.map