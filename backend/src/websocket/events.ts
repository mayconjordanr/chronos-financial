export enum RealtimeEvents {
  // Connection events
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  ONLINE_USERS = 'presence:online_users',
  ONLINE_USERS_UPDATED = 'presence:online_users_updated',

  // Transaction events
  TRANSACTION_CREATED = 'transaction:created',
  TRANSACTION_UPDATED = 'transaction:updated',
  TRANSACTION_DELETED = 'transaction:deleted',
  TRANSACTIONS_BULK_UPDATE = 'transactions:bulk_update',

  // Account events
  ACCOUNT_CREATED = 'account:created',
  ACCOUNT_UPDATED = 'account:updated',
  ACCOUNT_DELETED = 'account:deleted',
  ACCOUNT_BALANCE_UPDATED = 'account:balance_updated',

  // Card events
  CARD_CREATED = 'card:created',
  CARD_UPDATED = 'card:updated',
  CARD_DELETED = 'card:deleted',
  CARD_STATUS_CHANGED = 'card:status_changed',

  // Category events
  CATEGORY_CREATED = 'category:created',
  CATEGORY_UPDATED = 'category:updated',
  CATEGORY_DELETED = 'category:deleted',

  // System events
  TENANT_SETTINGS_UPDATED = 'tenant:settings_updated',
  USER_ROLE_CHANGED = 'user:role_changed',
  DATA_SYNC_REQUIRED = 'system:data_sync_required',

  // Error events
  ERROR = 'error',
  RATE_LIMIT_EXCEEDED = 'error:rate_limit_exceeded'
}

export interface BaseRealtimeEvent {
  eventType: RealtimeEvents;
  tenantId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Transaction event payloads
export interface TransactionCreatedEvent extends BaseRealtimeEvent {
  eventType: RealtimeEvents.TRANSACTION_CREATED;
  data: {
    transaction: any; // Will be the full transaction object
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

// Account event payloads
export interface AccountCreatedEvent extends BaseRealtimeEvent {
  eventType: RealtimeEvents.ACCOUNT_CREATED;
  data: {
    account: any; // Full account object
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

// Card event payloads
export interface CardCreatedEvent extends BaseRealtimeEvent {
  eventType: RealtimeEvents.CARD_CREATED;
  data: {
    card: any; // Full card object
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

// Category event payloads
export interface CategoryCreatedEvent extends BaseRealtimeEvent {
  eventType: RealtimeEvents.CATEGORY_CREATED;
  data: {
    category: any; // Full category object
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

// Presence event payloads
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

// System event payloads
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

// Error event payloads
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

// Union type for all possible realtime events
export type RealtimeEventPayload =
  | TransactionCreatedEvent
  | TransactionUpdatedEvent
  | TransactionDeletedEvent
  | TransactionsBulkUpdateEvent
  | AccountCreatedEvent
  | AccountUpdatedEvent
  | AccountDeletedEvent
  | AccountBalanceUpdatedEvent
  | CardCreatedEvent
  | CardUpdatedEvent
  | CardDeletedEvent
  | CardStatusChangedEvent
  | CategoryCreatedEvent
  | CategoryUpdatedEvent
  | CategoryDeletedEvent
  | UserJoinedEvent
  | UserLeftEvent
  | OnlineUsersEvent
  | TenantSettingsUpdatedEvent
  | UserRoleChangedEvent
  | DataSyncRequiredEvent
  | ErrorEvent
  | RateLimitExceededEvent;

// Event validation schemas
export const eventValidation = {
  isValidEventType: (eventType: string): eventType is RealtimeEvents => {
    return Object.values(RealtimeEvents).includes(eventType as RealtimeEvents);
  },

  validateBaseEvent: (event: any): event is BaseRealtimeEvent => {
    return (
      event &&
      typeof event.eventType === 'string' &&
      eventValidation.isValidEventType(event.eventType) &&
      typeof event.tenantId === 'string' &&
      typeof event.userId === 'string' &&
      event.timestamp instanceof Date
    );
  },

  sanitizeEventData: (data: any): any => {
    // Remove sensitive information from event data
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];

    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        delete sanitized[key];
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = eventValidation.sanitizeEventData(sanitized[key]);
      }
    });

    return sanitized;
  }
};

// Event priority levels for ordering
export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export const eventPriorities: Record<RealtimeEvents, EventPriority> = {
  [RealtimeEvents.USER_JOINED]: EventPriority.NORMAL,
  [RealtimeEvents.USER_LEFT]: EventPriority.NORMAL,
  [RealtimeEvents.ONLINE_USERS]: EventPriority.LOW,
  [RealtimeEvents.ONLINE_USERS_UPDATED]: EventPriority.LOW,
  [RealtimeEvents.TRANSACTION_CREATED]: EventPriority.HIGH,
  [RealtimeEvents.TRANSACTION_UPDATED]: EventPriority.HIGH,
  [RealtimeEvents.TRANSACTION_DELETED]: EventPriority.HIGH,
  [RealtimeEvents.TRANSACTIONS_BULK_UPDATE]: EventPriority.CRITICAL,
  [RealtimeEvents.ACCOUNT_CREATED]: EventPriority.HIGH,
  [RealtimeEvents.ACCOUNT_UPDATED]: EventPriority.HIGH,
  [RealtimeEvents.ACCOUNT_DELETED]: EventPriority.CRITICAL,
  [RealtimeEvents.ACCOUNT_BALANCE_UPDATED]: EventPriority.HIGH,
  [RealtimeEvents.CARD_CREATED]: EventPriority.NORMAL,
  [RealtimeEvents.CARD_UPDATED]: EventPriority.NORMAL,
  [RealtimeEvents.CARD_DELETED]: EventPriority.HIGH,
  [RealtimeEvents.CARD_STATUS_CHANGED]: EventPriority.HIGH,
  [RealtimeEvents.CATEGORY_CREATED]: EventPriority.NORMAL,
  [RealtimeEvents.CATEGORY_UPDATED]: EventPriority.NORMAL,
  [RealtimeEvents.CATEGORY_DELETED]: EventPriority.HIGH,
  [RealtimeEvents.TENANT_SETTINGS_UPDATED]: EventPriority.HIGH,
  [RealtimeEvents.USER_ROLE_CHANGED]: EventPriority.CRITICAL,
  [RealtimeEvents.DATA_SYNC_REQUIRED]: EventPriority.CRITICAL,
  [RealtimeEvents.ERROR]: EventPriority.HIGH,
  [RealtimeEvents.RATE_LIMIT_EXCEEDED]: EventPriority.HIGH
};