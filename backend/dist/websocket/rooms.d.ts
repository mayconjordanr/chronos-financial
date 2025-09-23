export declare class TenantRoomManager {
    private readonly TENANT_PREFIX;
    private readonly USER_PREFIX;
    private readonly ENTITY_PREFIX;
    private readonly TYPE_PREFIX;
    getTenantRoom(tenantId: string): string;
    getUserRoom(tenantId: string, userId: string): string;
    getEntityRoom(tenantId: string, entityType: string, entityId: string): string;
    getEntityTypeRoom(tenantId: string, entityType: string): string;
    getDefaultUserRooms(tenantId: string, userId: string): string[];
    validateTenantAccess(roomName: string, tenantId: string): boolean;
    extractTenantId(roomName: string): string | null;
    extractEntityType(roomName: string): string | null;
    extractEntityId(roomName: string): string | null;
    extractUserId(roomName: string): string | null;
    getEntityBroadcastRooms(tenantId: string, entityType: string, entityId: string): string[];
    getUserBroadcastRooms(tenantId: string, userIds: string[]): string[];
    isValidEntityType(entityType: string): boolean;
    getTenantAdminRoom(tenantId: string): string;
    canAccessAdminRoom(userRole: string): boolean;
    getNotificationRoom(tenantId: string): string;
    getTenantRoomPattern(tenantId: string): string;
    parseRoomInfo(roomName: string): {
        type: 'tenant' | 'user' | 'entity' | 'type' | 'unknown';
        tenantId?: string;
        userId?: string;
        entityType?: string;
        entityId?: string;
    };
}
//# sourceMappingURL=rooms.d.ts.map