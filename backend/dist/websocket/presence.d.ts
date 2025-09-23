import { AuthService } from '../modules/auth/auth.service';
export interface UserPresence {
    userId: string;
    email: string;
    role: string;
    socketIds: string[];
    connectedAt: Date;
    lastSeen: Date;
    metadata?: Record<string, any>;
}
export interface PresenceData {
    email: string;
    role: string;
    connectedAt: Date;
    metadata?: Record<string, any>;
}
export declare class PresenceManager {
    private authService;
    private readonly PRESENCE_PREFIX;
    private readonly SOCKET_PREFIX;
    private readonly TENANT_USERS_PREFIX;
    private readonly CONNECTION_TTL;
    constructor(authService: AuthService);
    private get redis();
    setUserOnline(tenantId: string, userId: string, socketId: string, presenceData: PresenceData): Promise<void>;
    removeUserConnection(tenantId: string, userId: string, socketId: string): Promise<boolean>;
    setUserOffline(tenantId: string, userId: string): Promise<void>;
    updateLastSeen(tenantId: string, userId: string, socketId: string): Promise<void>;
    getOnlineUsers(tenantId: string): Promise<Array<{
        userId: string;
        email: string;
        role: string;
        connectedAt: Date;
        lastSeen: Date;
        connectionCount: number;
    }>>;
    isUserOnline(tenantId: string, userId: string): Promise<boolean>;
    getUserPresence(tenantId: string, userId: string): Promise<UserPresence | null>;
    getOnlineUserCount(tenantId: string): Promise<number>;
    cleanupStaleConnections(maxAge?: number): Promise<void>;
    getAllActiveTenants(): Promise<string[]>;
    getSocketInfo(socketId: string): Promise<{
        tenantId: string;
        userId: string;
    } | null>;
    updateUserMetadata(tenantId: string, userId: string, metadata: Record<string, any>): Promise<void>;
    private getPresenceKey;
    private getSocketKey;
    private getTenantUsersKey;
}
//# sourceMappingURL=presence.d.ts.map