"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRoomManager = void 0;
class TenantRoomManager {
    TENANT_PREFIX = 'tenant:';
    USER_PREFIX = 'user:';
    ENTITY_PREFIX = 'entity:';
    TYPE_PREFIX = 'type:';
    getTenantRoom(tenantId) {
        return `${this.TENANT_PREFIX}${tenantId}`;
    }
    getUserRoom(tenantId, userId) {
        return `${this.USER_PREFIX}${tenantId}:${userId}`;
    }
    getEntityRoom(tenantId, entityType, entityId) {
        return `${this.ENTITY_PREFIX}${tenantId}:${entityType}:${entityId}`;
    }
    getEntityTypeRoom(tenantId, entityType) {
        return `${this.TYPE_PREFIX}${tenantId}:${entityType}`;
    }
    getDefaultUserRooms(tenantId, userId) {
        return [
            this.getTenantRoom(tenantId),
            this.getUserRoom(tenantId, userId)
        ];
    }
    validateTenantAccess(roomName, tenantId) {
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
    extractTenantId(roomName) {
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
    extractEntityType(roomName) {
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
    extractEntityId(roomName) {
        if (roomName.startsWith(this.ENTITY_PREFIX)) {
            const parts = roomName.substring(this.ENTITY_PREFIX.length).split(':');
            return parts[2] || null;
        }
        return null;
    }
    extractUserId(roomName) {
        if (roomName.startsWith(this.USER_PREFIX)) {
            const parts = roomName.substring(this.USER_PREFIX.length).split(':');
            return parts[1] || null;
        }
        return null;
    }
    getEntityBroadcastRooms(tenantId, entityType, entityId) {
        return [
            this.getTenantRoom(tenantId),
            this.getEntityTypeRoom(tenantId, entityType),
            this.getEntityRoom(tenantId, entityType, entityId)
        ];
    }
    getUserBroadcastRooms(tenantId, userIds) {
        return userIds.map(userId => this.getUserRoom(tenantId, userId));
    }
    isValidEntityType(entityType) {
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
    getTenantAdminRoom(tenantId) {
        return `${this.TENANT_PREFIX}${tenantId}:admin`;
    }
    canAccessAdminRoom(userRole) {
        const adminRoles = ['admin', 'owner', 'super_admin'];
        return adminRoles.includes(userRole.toLowerCase());
    }
    getNotificationRoom(tenantId) {
        return `${this.TENANT_PREFIX}${tenantId}:notifications`;
    }
    getTenantRoomPattern(tenantId) {
        return `*${tenantId}*`;
    }
    parseRoomInfo(roomName) {
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
exports.TenantRoomManager = TenantRoomManager;
//# sourceMappingURL=rooms.js.map