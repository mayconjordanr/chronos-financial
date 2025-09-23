"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventPriorities = exports.EventPriority = exports.eventValidation = exports.RealtimeEvents = void 0;
var RealtimeEvents;
(function (RealtimeEvents) {
    RealtimeEvents["USER_JOINED"] = "user:joined";
    RealtimeEvents["USER_LEFT"] = "user:left";
    RealtimeEvents["ONLINE_USERS"] = "presence:online_users";
    RealtimeEvents["ONLINE_USERS_UPDATED"] = "presence:online_users_updated";
    RealtimeEvents["TRANSACTION_CREATED"] = "transaction:created";
    RealtimeEvents["TRANSACTION_UPDATED"] = "transaction:updated";
    RealtimeEvents["TRANSACTION_DELETED"] = "transaction:deleted";
    RealtimeEvents["TRANSACTIONS_BULK_UPDATE"] = "transactions:bulk_update";
    RealtimeEvents["ACCOUNT_CREATED"] = "account:created";
    RealtimeEvents["ACCOUNT_UPDATED"] = "account:updated";
    RealtimeEvents["ACCOUNT_DELETED"] = "account:deleted";
    RealtimeEvents["ACCOUNT_BALANCE_UPDATED"] = "account:balance_updated";
    RealtimeEvents["CARD_CREATED"] = "card:created";
    RealtimeEvents["CARD_UPDATED"] = "card:updated";
    RealtimeEvents["CARD_DELETED"] = "card:deleted";
    RealtimeEvents["CARD_STATUS_CHANGED"] = "card:status_changed";
    RealtimeEvents["CATEGORY_CREATED"] = "category:created";
    RealtimeEvents["CATEGORY_UPDATED"] = "category:updated";
    RealtimeEvents["CATEGORY_DELETED"] = "category:deleted";
    RealtimeEvents["TENANT_SETTINGS_UPDATED"] = "tenant:settings_updated";
    RealtimeEvents["USER_ROLE_CHANGED"] = "user:role_changed";
    RealtimeEvents["DATA_SYNC_REQUIRED"] = "system:data_sync_required";
    RealtimeEvents["ERROR"] = "error";
    RealtimeEvents["RATE_LIMIT_EXCEEDED"] = "error:rate_limit_exceeded";
})(RealtimeEvents || (exports.RealtimeEvents = RealtimeEvents = {}));
exports.eventValidation = {
    isValidEventType: (eventType) => {
        return Object.values(RealtimeEvents).includes(eventType);
    },
    validateBaseEvent: (event) => {
        return (event &&
            typeof event.eventType === 'string' &&
            exports.eventValidation.isValidEventType(event.eventType) &&
            typeof event.tenantId === 'string' &&
            typeof event.userId === 'string' &&
            event.timestamp instanceof Date);
    },
    sanitizeEventData: (data) => {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
        if (typeof data !== 'object' || data === null) {
            return data;
        }
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                delete sanitized[key];
            }
            else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = exports.eventValidation.sanitizeEventData(sanitized[key]);
            }
        });
        return sanitized;
    }
};
var EventPriority;
(function (EventPriority) {
    EventPriority[EventPriority["LOW"] = 0] = "LOW";
    EventPriority[EventPriority["NORMAL"] = 1] = "NORMAL";
    EventPriority[EventPriority["HIGH"] = 2] = "HIGH";
    EventPriority[EventPriority["CRITICAL"] = 3] = "CRITICAL";
})(EventPriority || (exports.EventPriority = EventPriority = {}));
exports.eventPriorities = {
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
//# sourceMappingURL=events.js.map