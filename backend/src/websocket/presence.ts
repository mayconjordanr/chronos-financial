import { Redis } from 'redis';
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

export class PresenceManager {
  private readonly PRESENCE_PREFIX = 'presence:';
  private readonly SOCKET_PREFIX = 'socket:';
  private readonly TENANT_USERS_PREFIX = 'tenant_users:';
  private readonly CONNECTION_TTL = 5 * 60; // 5 minutes

  constructor(private authService: AuthService) {}

  /**
   * Get Redis client from auth service
   */
  private get redis(): Redis {
    return (this.authService as any).redis;
  }

  /**
   * Set user as online with a specific socket connection
   */
  async setUserOnline(
    tenantId: string,
    userId: string,
    socketId: string,
    presenceData: PresenceData
  ): Promise<void> {
    const now = new Date();
    const presenceKey = this.getPresenceKey(tenantId, userId);
    const socketKey = this.getSocketKey(socketId);
    const tenantUsersKey = this.getTenantUsersKey(tenantId);

    try {
      // Get existing presence data
      const existingData = await this.redis.get(presenceKey);
      let presence: UserPresence;

      if (existingData) {
        presence = JSON.parse(existingData);
        // Add new socket ID if not already present
        if (!presence.socketIds.includes(socketId)) {
          presence.socketIds.push(socketId);
        }
        presence.lastSeen = now;
      } else {
        // Create new presence record
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

      // Store updated presence data
      await this.redis.setEx(
        presenceKey,
        this.CONNECTION_TTL,
        JSON.stringify(presence)
      );

      // Map socket ID to user and tenant for cleanup
      await this.redis.setEx(
        socketKey,
        this.CONNECTION_TTL,
        JSON.stringify({ tenantId, userId })
      );

      // Add user to tenant's active users set
      await this.redis.sAdd(tenantUsersKey, userId);
      await this.redis.expire(tenantUsersKey, this.CONNECTION_TTL);

      console.log(`User ${userId} set online in tenant ${tenantId} with socket ${socketId}`);
    } catch (error) {
      console.error('Error setting user online:', error);
      throw error;
    }
  }

  /**
   * Remove a specific socket connection for a user
   * Returns true if user still has other active connections
   */
  async removeUserConnection(
    tenantId: string,
    userId: string,
    socketId: string
  ): Promise<boolean> {
    const presenceKey = this.getPresenceKey(tenantId, userId);
    const socketKey = this.getSocketKey(socketId);

    try {
      // Remove socket mapping
      await this.redis.del(socketKey);

      // Get current presence data
      const existingData = await this.redis.get(presenceKey);
      if (!existingData) {
        return false;
      }

      const presence: UserPresence = JSON.parse(existingData);

      // Remove socket ID from the list
      presence.socketIds = presence.socketIds.filter(id => id !== socketId);

      if (presence.socketIds.length === 0) {
        // No more active connections, remove from presence
        await this.setUserOffline(tenantId, userId);
        return false;
      } else {
        // Update presence with remaining socket IDs
        presence.lastSeen = new Date();
        await this.redis.setEx(
          presenceKey,
          this.CONNECTION_TTL,
          JSON.stringify(presence)
        );
        return true;
      }
    } catch (error) {
      console.error('Error removing user connection:', error);
      return false;
    }
  }

  /**
   * Set user as offline (remove all presence data)
   */
  async setUserOffline(tenantId: string, userId: string): Promise<void> {
    const presenceKey = this.getPresenceKey(tenantId, userId);
    const tenantUsersKey = this.getTenantUsersKey(tenantId);

    try {
      // Get presence data to cleanup socket mappings
      const existingData = await this.redis.get(presenceKey);
      if (existingData) {
        const presence: UserPresence = JSON.parse(existingData);

        // Clean up socket mappings
        for (const socketId of presence.socketIds) {
          const socketKey = this.getSocketKey(socketId);
          await this.redis.del(socketKey);
        }
      }

      // Remove presence data
      await this.redis.del(presenceKey);

      // Remove from tenant's active users
      await this.redis.sRem(tenantUsersKey, userId);

      console.log(`User ${userId} set offline in tenant ${tenantId}`);
    } catch (error) {
      console.error('Error setting user offline:', error);
      throw error;
    }
  }

  /**
   * Update last seen timestamp for a user
   */
  async updateLastSeen(
    tenantId: string,
    userId: string,
    socketId: string
  ): Promise<void> {
    const presenceKey = this.getPresenceKey(tenantId, userId);

    try {
      const existingData = await this.redis.get(presenceKey);
      if (!existingData) {
        return;
      }

      const presence: UserPresence = JSON.parse(existingData);

      // Update last seen if this socket is in the list
      if (presence.socketIds.includes(socketId)) {
        presence.lastSeen = new Date();

        await this.redis.setEx(
          presenceKey,
          this.CONNECTION_TTL,
          JSON.stringify(presence)
        );
      }
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  /**
   * Get all online users for a tenant
   */
  async getOnlineUsers(tenantId: string): Promise<Array<{
    userId: string;
    email: string;
    role: string;
    connectedAt: Date;
    lastSeen: Date;
    connectionCount: number;
  }>> {
    const tenantUsersKey = this.getTenantUsersKey(tenantId);

    try {
      const userIds = await this.redis.sMembers(tenantUsersKey);
      const onlineUsers = [];

      for (const userId of userIds) {
        const presenceKey = this.getPresenceKey(tenantId, userId);
        const presenceData = await this.redis.get(presenceKey);

        if (presenceData) {
          const presence: UserPresence = JSON.parse(presenceData);
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
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  /**
   * Check if a specific user is online
   */
  async isUserOnline(tenantId: string, userId: string): Promise<boolean> {
    const presenceKey = this.getPresenceKey(tenantId, userId);

    try {
      const presenceData = await this.redis.get(presenceKey);
      return presenceData !== null;
    } catch (error) {
      console.error('Error checking user online status:', error);
      return false;
    }
  }

  /**
   * Get user presence data
   */
  async getUserPresence(tenantId: string, userId: string): Promise<UserPresence | null> {
    const presenceKey = this.getPresenceKey(tenantId, userId);

    try {
      const presenceData = await this.redis.get(presenceKey);
      if (!presenceData) {
        return null;
      }

      const presence: UserPresence = JSON.parse(presenceData);
      return {
        ...presence,
        connectedAt: new Date(presence.connectedAt),
        lastSeen: new Date(presence.lastSeen)
      };
    } catch (error) {
      console.error('Error getting user presence:', error);
      return null;
    }
  }

  /**
   * Get count of online users for a tenant
   */
  async getOnlineUserCount(tenantId: string): Promise<number> {
    const tenantUsersKey = this.getTenantUsersKey(tenantId);

    try {
      return await this.redis.sCard(tenantUsersKey);
    } catch (error) {
      console.error('Error getting online user count:', error);
      return 0;
    }
  }

  /**
   * Clean up stale connections (connections that haven't been updated)
   */
  async cleanupStaleConnections(maxAge: number = 5 * 60 * 1000): Promise<void> {
    const pattern = `${this.PRESENCE_PREFIX}*`;

    try {
      const keys = await this.redis.keys(pattern);
      const now = Date.now();

      for (const key of keys) {
        const presenceData = await this.redis.get(key);
        if (!presenceData) continue;

        const presence: UserPresence = JSON.parse(presenceData);
        const lastSeenTime = new Date(presence.lastSeen).getTime();

        if (now - lastSeenTime > maxAge) {
          // Extract tenant and user ID from key
          const keyParts = key.replace(this.PRESENCE_PREFIX, '').split(':');
          if (keyParts.length === 2) {
            const [tenantId, userId] = keyParts;
            await this.setUserOffline(tenantId, userId);
            console.log(`Cleaned up stale connection for user ${userId} in tenant ${tenantId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up stale connections:', error);
    }
  }

  /**
   * Get all active tenants with online users
   */
  async getAllActiveTenants(): Promise<string[]> {
    const pattern = `${this.TENANT_USERS_PREFIX}*`;

    try {
      const keys = await this.redis.keys(pattern);
      return keys.map(key =>
        key.replace(this.TENANT_USERS_PREFIX, '')
      ).filter(tenantId => tenantId.length > 0);
    } catch (error) {
      console.error('Error getting active tenants:', error);
      return [];
    }
  }

  /**
   * Get socket information by socket ID
   */
  async getSocketInfo(socketId: string): Promise<{ tenantId: string; userId: string } | null> {
    const socketKey = this.getSocketKey(socketId);

    try {
      const socketData = await this.redis.get(socketKey);
      if (!socketData) {
        return null;
      }

      return JSON.parse(socketData);
    } catch (error) {
      console.error('Error getting socket info:', error);
      return null;
    }
  }

  /**
   * Update user metadata in presence
   */
  async updateUserMetadata(
    tenantId: string,
    userId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const presenceKey = this.getPresenceKey(tenantId, userId);

    try {
      const existingData = await this.redis.get(presenceKey);
      if (!existingData) {
        return;
      }

      const presence: UserPresence = JSON.parse(existingData);
      presence.metadata = { ...presence.metadata, ...metadata };
      presence.lastSeen = new Date();

      await this.redis.setEx(
        presenceKey,
        this.CONNECTION_TTL,
        JSON.stringify(presence)
      );
    } catch (error) {
      console.error('Error updating user metadata:', error);
    }
  }

  /**
   * Generate Redis keys
   */
  private getPresenceKey(tenantId: string, userId: string): string {
    return `${this.PRESENCE_PREFIX}${tenantId}:${userId}`;
  }

  private getSocketKey(socketId: string): string {
    return `${this.SOCKET_PREFIX}${socketId}`;
  }

  private getTenantUsersKey(tenantId: string): string {
    return `${this.TENANT_USERS_PREFIX}${tenantId}`;
  }
}