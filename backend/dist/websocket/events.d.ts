export declare enum RealtimeEvents {
    USER_JOINED = "user:joined",
    USER_LEFT = "user:left",
    ONLINE_USERS = "presence:online_users",
    ONLINE_USERS_UPDATED = "presence:online_users_updated",
    TRANSACTION_CREATED = "transaction:created",
    TRANSACTION_UPDATED = "transaction:updated",
    TRANSACTION_DELETED = "transaction:deleted",
    TRANSACTIONS_BULK_UPDATE = "transactions:bulk_update",
    ACCOUNT_CREATED = "account:created",
    ACCOUNT_UPDATED = "account:updated",
    ACCOUNT_DELETED = "account:deleted",
    ACCOUNT_BALANCE_UPDATED = "account:balance_updated",
    CARD_CREATED = "card:created",
    CARD_UPDATED = "card:updated",
    CARD_DELETED = "card:deleted",
    CARD_STATUS_CHANGED = "card:status_changed",
    CATEGORY_CREATED = "category:created",
    CATEGORY_UPDATED = "category:updated",
    CATEGORY_DELETED = "category:deleted",
    TENANT_SETTINGS_UPDATED = "tenant:settings_updated",
    USER_ROLE_CHANGED = "user:role_changed",
    DATA_SYNC_REQUIRED = "system:data_sync_required",
    ERROR = "error",
    RATE_LIMIT_EXCEEDED = "error:rate_limit_exceeded"
}
export interface BaseRealtimeEvent {
    eventType: RealtimeEvents;
    tenantId: string;
    userId: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
export interface TransactionCreatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.TRANSACTION_CREATED;
    data: {
        transaction: any;
        accountId: string;
        categoryId?: string;
        cardId?: string;
    };
}
export interface TransactionUpdatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.TRANSACTION_UPDATED;
    data: {
        transactionId: string;
        previousData: Partial<any>;
        updatedData: any;
        accountId: string;
        categoryId?: string;
        cardId?: string;
    };
}
export interface TransactionDeletedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.TRANSACTION_DELETED;
    data: {
        transactionId: string;
        deletedTransaction: any;
        accountId: string;
    };
}
export interface TransactionsBulkUpdateEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.TRANSACTIONS_BULK_UPDATE;
    data: {
        transactionIds: string[];
        operation: 'update' | 'delete' | 'categorize';
        changes: Record<string, any>;
        affectedAccounts: string[];
    };
}
export interface AccountCreatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.ACCOUNT_CREATED;
    data: {
        account: any;
    };
}
export interface AccountUpdatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.ACCOUNT_UPDATED;
    data: {
        accountId: string;
        previousData: Partial<any>;
        updatedData: any;
    };
}
export interface AccountDeletedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.ACCOUNT_DELETED;
    data: {
        accountId: string;
        deletedAccount: any;
        affectedTransactions: number;
    };
}
export interface AccountBalanceUpdatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.ACCOUNT_BALANCE_UPDATED;
    data: {
        accountId: string;
        previousBalance: number;
        newBalance: number;
        transactionId?: string;
        reason: 'transaction' | 'adjustment' | 'reconciliation';
    };
}
export interface CardCreatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.CARD_CREATED;
    data: {
        card: any;
        accountId: string;
    };
}
export interface CardUpdatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.CARD_UPDATED;
    data: {
        cardId: string;
        previousData: Partial<any>;
        updatedData: any;
        accountId: string;
    };
}
export interface CardDeletedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.CARD_DELETED;
    data: {
        cardId: string;
        deletedCard: any;
        accountId: string;
        affectedTransactions: number;
    };
}
export interface CardStatusChangedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.CARD_STATUS_CHANGED;
    data: {
        cardId: string;
        previousStatus: string;
        newStatus: string;
        reason?: string;
    };
}
export interface CategoryCreatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.CATEGORY_CREATED;
    data: {
        category: any;
    };
}
export interface CategoryUpdatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.CATEGORY_UPDATED;
    data: {
        categoryId: string;
        previousData: Partial<any>;
        updatedData: any;
    };
}
export interface CategoryDeletedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.CATEGORY_DELETED;
    data: {
        categoryId: string;
        deletedCategory: any;
        affectedTransactions: number;
    };
}
export interface UserJoinedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.USER_JOINED;
    data: {
        email: string;
        role: string;
    };
}
export interface UserLeftEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.USER_LEFT;
    data: {
        email: string;
    };
}
export interface OnlineUsersEvent {
    eventType: RealtimeEvents.ONLINE_USERS | RealtimeEvents.ONLINE_USERS_UPDATED;
    data: {
        users: Array<{
            userId: string;
            email: string;
            role: string;
            connectedAt: Date;
            lastSeen: Date;
        }>;
        totalCount: number;
    };
}
export interface TenantSettingsUpdatedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.TENANT_SETTINGS_UPDATED;
    data: {
        previousSettings: Record<string, any>;
        updatedSettings: Record<string, any>;
        changedFields: string[];
    };
}
export interface UserRoleChangedEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.USER_ROLE_CHANGED;
    data: {
        targetUserId: string;
        targetUserEmail: string;
        previousRole: string;
        newRole: string;
        changedBy: string;
    };
}
export interface DataSyncRequiredEvent extends BaseRealtimeEvent {
    eventType: RealtimeEvents.DATA_SYNC_REQUIRED;
    data: {
        entityTypes: string[];
        reason: 'bulk_operation' | 'system_update' | 'data_migration';
        description?: string;
    };
}
export interface ErrorEvent {
    eventType: RealtimeEvents.ERROR;
    data: {
        errorCode: string;
        message: string;
        details?: any;
        timestamp: Date;
    };
}
export interface RateLimitExceededEvent {
    eventType: RealtimeEvents.RATE_LIMIT_EXCEEDED;
    data: {
        limit: number;
        windowMs: number;
        retryAfter: number;
        timestamp: Date;
    };
}
export type RealtimeEventPayload = TransactionCreatedEvent | TransactionUpdatedEvent | TransactionDeletedEvent | TransactionsBulkUpdateEvent | AccountCreatedEvent | AccountUpdatedEvent | AccountDeletedEvent | AccountBalanceUpdatedEvent | CardCreatedEvent | CardUpdatedEvent | CardDeletedEvent | CardStatusChangedEvent | CategoryCreatedEvent | CategoryUpdatedEvent | CategoryDeletedEvent | UserJoinedEvent | UserLeftEvent | OnlineUsersEvent | TenantSettingsUpdatedEvent | UserRoleChangedEvent | DataSyncRequiredEvent | ErrorEvent | RateLimitExceededEvent;
export declare const eventValidation: {
    isValidEventType: (eventType: string) => eventType is RealtimeEvents;
    validateBaseEvent: (event: any) => event is BaseRealtimeEvent;
    sanitizeEventData: (data: any) => any;
};
export declare enum EventPriority {
    LOW = 0,
    NORMAL = 1,
    HIGH = 2,
    CRITICAL = 3
}
export declare const eventPriorities: Record<RealtimeEvents, EventPriority>;
//# sourceMappingURL=events.d.ts.map