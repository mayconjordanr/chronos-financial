"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceManager = void 0;
class PresenceManager {
    authService;
    PRESENCE_PREFIX = 'presence:';
    SOCKET_PREFIX = 'socket:';
    TENANT_USERS_PREFIX = 'tenant_users:';
    CONNECTION_TTL = 5 * 60;
    constructor(authService) {
        this.authService = authService;
    }
    get redis() {
        return this.authService.redis;
    }
    async setUserOnline(tenantId, userId, socketId, presenceData) {
        const now = new Date();
        const presenceKey = this.getPresenceKey(tenantId, userId);
        const socketKey = this.getSocketKey(socketId);
        const tenantUsersKey = this.getTenantUsersKey(tenantId);
        try {
            const existingData = await this.redis.get(presenceKey);
            let presence;
            if (existingData) {
                presence = JSON.parse(existingData);
                if (!presence.socketIds.includes(socketId)) {
                    presence.socketIds.push(socketId);
                }
                presence.lastSeen = now;
            }
            else {
                presence = {
                    userId,
                    email: presenceData.email,
                    role: presenceData.role,
                    socketIds: [socketId],
                    connectedAt: presenceData.connectedAt,
                    lastSeen: now,
                    metadata: presenceData.metadata
                };
            }
            await this.redis.setEx(presenceKey, this.CONNECTION_TTL, JSON.stringify(presence));
            await this.redis.setEx(socketKey, this.CONNECTION_TTL, JSON.stringify({ tenantId, userId }));
            await this.redis.sAdd(tenantUsersKey, userId);
            await this.redis.expire(tenantUsersKey, this.CONNECTION_TTL);
            console.log(`User ${userId} set online in tenant ${tenantId} with socket ${socketId}`);
        }
        catch (error) {
            console.error('Error setting user online:', error);
            throw error;
        }
    }
    async removeUserConnection(tenantId, userId, socketId) {
        const presenceKey = this.getPresenceKey(tenantId, userId);
        const socketKey = this.getSocketKey(socketId);
        try {
            await this.redis.del(socketKey);
            const existingData = await this.redis.get(presenceKey);
            if (!existingData) {
                return false;
            }
            const presence = JSON.parse(existingData);
            presence.socketIds = presence.socketIds.filter(id => id !== socketId);
            if (presence.socketIds.length === 0) {
                await this.setUserOffline(tenantId, userId);
                return false;
            }
            else {
                presence.lastSeen = new Date();
                await this.redis.setEx(presenceKey, this.CONNECTION_TTL, JSON.stringify(presence));
                return true;
            }
        }
        catch (error) {
            console.error('Error removing user connection:', error);
            return false;
        }
    }
    async setUserOffline(tenantId, userId) {
        const presenceKey = this.getPresenceKey(tenantId, userId);
        const tenantUsersKey = this.getTenantUsersKey(tenantId);
        try {
            const existingData = await this.redis.get(presenceKey);
            if (existingData) {
                const presence = JSON.parse(existingData);
                for (const socketId of presence.socketIds) {
                    const socketKey = this.getSocketKey(socketId);
                    await this.redis.del(socketKey);
                }
            }
            await this.redis.del(presenceKey);
            await this.redis.sRem(tenantUsersKey, userId);
            console.log(`User ${userId} set offline in tenant ${tenantId}`);
        }
        catch (error) {
            console.error('Error setting user offline:', error);
            throw error;
        }
    }
    async updateLastSeen(tenantId, userId, socketId) {
        const presenceKey = this.getPresenceKey(tenantId, userId);
        try {
            const existingData = await this.redis.get(presenceKey);
            if (!existingData) {
                return;
            }
            const presence = JSON.parse(existingData);
            if (presence.socketIds.includes(socketId)) {
                presence.lastSeen = new Date();
                await this.redis.setEx(presenceKey, this.CONNECTION_TTL, JSON.stringify(presence));
            }
        }
        catch (error) {
            console.error('Error updating last seen:', error);
        }
    }
    async getOnlineUsers(tenantId) {
        const tenantUsersKey = this.getTenantUsersKey(tenantId);
        try {
            const userIds = await this.redis.sMembers(tenantUsersKey);
            const onlineUsers = [];
            for (const userId of userIds) {
                const presenceKey = this.getPresenceKey(tenantId, userId);
                const presenceData = await this.redis.get(presenceKey);
                if (presenceData) {
                    const presence = JSON.parse(presenceData);
                    onlineUsers.push({
                        userId: presence.userId,
                        email: presence.email,
                        role: presence.role,
                        connectedAt: new Date(presence.connectedAt),
                        lastSeen: new Date(presence.lastSeen),
                        connectionCount: presence.socketIds.length
                    });
                }
            }
            return onlineUsers.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
        }
        catch (error) {
            console.error('Error getting online users:', error);
            return [];
        }
    }
    async isUserOnline(tenantId, userId) {
        const presenceKey = this.getPresenceKey(tenantId, userId);
        try {
            const presenceData = await this.redis.get(presenceKey);
            return presenceData !== null;
        }
        catch (error) {
            console.error('Error checking user online status:', error);
            return false;
        }
    }
    async getUserPresence(tenantId, userId) {
        const presenceKey = this.getPresenceKey(tenantId, userId);
        try {
            const presenceData = await this.redis.get(presenceKey);
            if (!presenceData) {
                return null;
            }
            const presence = JSON.parse(presenceData);
            return {
                ...presence,
                connectedAt: new Date(presence.connectedAt),
                lastSeen: new Date(presence.lastSeen)
            };
        }
        catch (error) {
            console.error('Error getting user presence:', error);
            return null;
        }
    }
    async getOnlineUserCount(tenantId) {
        const tenantUsersKey = this.getTenantUsersKey(tenantId);
        try {
            return await this.redis.sCard(tenantUsersKey);
        }
        catch (error) {
            console.error('Error getting online user count:', error);
            return 0;
        }
    }
    async cleanupStaleConnections(maxAge = 5 * 60 * 1000) {
        const pattern = `${this.PRESENCE_PREFIX}*`;
        try {
            const keys = await this.redis.keys(pattern);
            const now = Date.now();
            for (const key of keys) {
                const presenceData = await this.redis.get(key);
                if (!presenceData)
                    continue;
                const presence = JSON.parse(presenceData);
                const lastSeenTime = new Date(presence.lastSeen).getTime();
                if (now - lastSeenTime > maxAge) {
                    const keyParts = key.replace(this.PRESENCE_PREFIX, '').split(':');
                    if (keyParts.length === 2) {
                        const [tenantId, userId] = keyParts;
                        await this.setUserOffline(tenantId, userId);
                        console.log(`Cleaned up stale connection for user ${userId} in tenant ${tenantId}`);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error cleaning up stale connections:', error);
        }
    }
    async getAllActiveTenants() {
        const pattern = `${this.TENANT_USERS_PREFIX}*`;
        try {
            const keys = await this.redis.keys(pattern);
            return keys.map(key => key.replace(this.TENANT_USERS_PREFIX, '')).filter(tenantId => tenantId.length > 0);
        }
        catch (error) {
            console.error('Error getting active tenants:', error);
            return [];
        }
    }
    async getSocketInfo(socketId) {
        const socketKey = this.getSocketKey(socketId);
        try {
            const socketData = await this.redis.get(socketKey);
            if (!socketData) {
                return null;
            }
            return JSON.parse(socketData);
        }
        catch (error) {
            console.error('Error getting socket info:', error);
            return null;
        }
    }
    async updateUserMetadata(tenantId, userId, metadata) {
        const presenceKey = this.getPresenceKey(tenantId, userId);
        try {
            const existingData = await this.redis.get(presenceKey);
            if (!existingData) {
                return;
            }
            const presence = JSON.parse(existingData);
            presence.metadata = { ...presence.metadata, ...metadata };
            presence.lastSeen = new Date();
            await this.redis.setEx(presenceKey, this.CONNECTION_TTL, JSON.stringify(presence));
        }
        catch (error) {
            console.error('Error updating user metadata:', error);
        }
    }
    getPresenceKey(tenantId, userId) {
        return `${this.PRESENCE_PREFIX}${tenantId}:${userId}`;
    }
    getSocketKey(socketId) {
        return `${this.SOCKET_PREFIX}${socketId}`;
    }
    getTenantUsersKey(tenantId) {
        return `${this.TENANT_USERS_PREFIX}${tenantId}`;
    }
}
exports.PresenceManager = PresenceManager;
//# sourceMappingURL=presence.js.map