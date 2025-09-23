export class TenantRoomManager {
  private readonly TENANT_PREFIX = 'tenant:';
  private readonly USER_PREFIX = 'user:';
  private readonly ENTITY_PREFIX = 'entity:';
  private readonly TYPE_PREFIX = 'type:';

  /**
   * Get the main room name for a tenant
   * All users in the tenant join this room for general broadcasts
   */
  getTenantRoom(tenantId: string): string {
    return `${this.TENANT_PREFIX}${tenantId}`;
  }

  /**
   * Get a user-specific room within a tenant
   * Used for direct messages to specific users
   */
  getUserRoom(tenantId: string, userId: string): string {
    return `${this.USER_PREFIX}${tenantId}:${userId}`;
  }

  /**
   * Get a room for a specific entity instance
   * Used for subscribing to updates for a particular entity
   */
  getEntityRoom(tenantId: string, entityType: string, entityId: string): string {
    return `${this.ENTITY_PREFIX}${tenantId}:${entityType}:${entityId}`;
  }

  /**
   * Get a room for all entities of a specific type
   * Used for subscribing to all entities of a type (e.g., all transactions)
   */
  getEntityTypeRoom(tenantId: string, entityType: string): string {
    return `${this.TYPE_PREFIX}${tenantId}:${entityType}`;
  }

  /**
   * Get all room names that a user should join by default
   */
  getDefaultUserRooms(tenantId: string, userId: string): string[] {
    return [
      this.getTenantRoom(tenantId),
      this.getUserRoom(tenantId, userId)
    ];
  }

  /**
   * Validate if a room name belongs to a specific tenant
   */
  validateTenantAccess(roomName: string, tenantId: string): boolean {
    if (roomName.startsWith(this.TENANT_PREFIX)) {
      return roomName === this.getTenantRoom(tenantId);
    }

    if (roomName.startsWith(this.USER_PREFIX)) {
      return roomName.startsWith(`${this.USER_PREFIX}${tenantId}:`);
    }

    if (roomName.startsWith(this.ENTITY_PREFIX)) {
      return roomName.startsWith(`${this.ENTITY_PREFIX}${tenantId}:`);
    }

    if (roomName.startsWith(this.TYPE_PREFIX)) {
      return roomName.startsWith(`${this.TYPE_PREFIX}${tenantId}:`);
    }

    return false;
  }

  /**
   * Extract tenant ID from room name
   */
  extractTenantId(roomName: string): string | null {
    if (roomName.startsWith(this.TENANT_PREFIX)) {
      return roomName.substring(this.TENANT_PREFIX.length);
    }

    if (roomName.startsWith(this.USER_PREFIX)) {
      const parts = roomName.substring(this.USER_PREFIX.length).split(':');
      return parts[0] || null;
    }

    if (roomName.startsWith(this.ENTITY_PREFIX)) {
      const parts = roomName.substring(this.ENTITY_PREFIX.length).split(':');
      return parts[0] || null;
    }

    if (roomName.startsWith(this.TYPE_PREFIX)) {
      const parts = roomName.substring(this.TYPE_PREFIX.length).split(':');
      return parts[0] || null;
    }

    return null;
  }

  /**
   * Extract entity type from entity or type room name
   */
  extractEntityType(roomName: string): string | null {
    if (roomName.startsWith(this.ENTITY_PREFIX)) {
      const parts = roomName.substring(this.ENTITY_PREFIX.length).split(':');
      return parts[1] || null;
    }

    if (roomName.startsWith(this.TYPE_PREFIX)) {
      const parts = roomName.substring(this.TYPE_PREFIX.length).split(':');
      return parts[1] || null;
    }

    return null;
  }

  /**
   * Extract entity ID from entity room name
   */
  extractEntityId(roomName: string): string | null {
    if (roomName.startsWith(this.ENTITY_PREFIX)) {
      const parts = roomName.substring(this.ENTITY_PREFIX.length).split(':');
      return parts[2] || null;
    }

    return null;
  }

  /**
   * Extract user ID from user room name
   */
  extractUserId(roomName: string): string | null {
    if (roomName.startsWith(this.USER_PREFIX)) {
      const parts = roomName.substring(this.USER_PREFIX.length).split(':');
      return parts[1] || null;
    }

    return null;
  }

  /**
   * Get all possible room names for broadcasting an entity event
   */
  getEntityBroadcastRooms(
    tenantId: string,
    entityType: string,
    entityId: string
  ): string[] {
    return [
      this.getTenantRoom(tenantId),
      this.getEntityTypeRoom(tenantId, entityType),
      this.getEntityRoom(tenantId, entityType, entityId)
    ];
  }

  /**
   * Get room names for broadcasting to specific users
   */
  getUserBroadcastRooms(tenantId: string, userIds: string[]): string[] {
    return userIds.map(userId => this.getUserRoom(tenantId, userId));
  }

  /**
   * Validate entity type for security
   */
  isValidEntityType(entityType: string): boolean {
    const validEntityTypes = [
      'transaction',
      'account',
      'card',
      'category',
      'user',
      'tenant'
    ];

    return validEntityTypes.includes(entityType.toLowerCase());
  }

  /**
   * Get tenant-specific admin room for admin-only broadcasts
   */
  getTenantAdminRoom(tenantId: string): string {
    return `${this.TENANT_PREFIX}${tenantId}:admin`;
  }

  /**
   * Check if user should have access to admin room
   */
  canAccessAdminRoom(userRole: string): boolean {
    const adminRoles = ['admin', 'owner', 'super_admin'];
    return adminRoles.includes(userRole.toLowerCase());
  }

  /**
   * Get notification room for system-wide notifications
   */
  getNotificationRoom(tenantId: string): string {
    return `${this.TENANT_PREFIX}${tenantId}:notifications`;
  }

  /**
   * Get room pattern for cleaning up stale rooms
   */
  getTenantRoomPattern(tenantId: string): string {
    return `*${tenantId}*`;
  }

  /**
   * Parse room information for logging and debugging
   */
  parseRoomInfo(roomName: string): {
    type: 'tenant' | 'user' | 'entity' | 'type' | 'unknown';
    tenantId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
  } {
    if (roomName.startsWith(this.TENANT_PREFIX)) {
      const tenantId = this.extractTenantId(roomName);
      return {
        type: 'tenant',
        tenantId: tenantId || undefined
      };
    }

    if (roomName.startsWith(this.USER_PREFIX)) {
      const tenantId = this.extractTenantId(roomName);
      const userId = this.extractUserId(roomName);
      return {
        type: 'user',
        tenantId: tenantId || undefined,
        userId: userId || undefined
      };
    }

    if (roomName.startsWith(this.ENTITY_PREFIX)) {
      const tenantId = this.extractTenantId(roomName);
      const entityType = this.extractEntityType(roomName);
      const entityId = this.extractEntityId(roomName);
      return {
        type: 'entity',
        tenantId: tenantId || undefined,
        entityType: entityType || undefined,
        entityId: entityId || undefined
      };
    }

    if (roomName.startsWith(this.TYPE_PREFIX)) {
      const tenantId = this.extractTenantId(roomName);
      const entityType = this.extractEntityType(roomName);
      return {
        type: 'type',
        tenantId: tenantId || undefined,
        entityType: entityType || undefined
      };
    }

    return { type: 'unknown' };
  }
}