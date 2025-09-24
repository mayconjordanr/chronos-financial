import { WhatsAppMessage, WhatsAppUser, Tenant, MessageDirection } from '@prisma/client';
import { z } from 'zod';
export declare const CreateWhatsAppMessageSchema: z.ZodObject<{
    tenantId: z.ZodString;
    whatsappUserId: z.ZodOptional<z.ZodString>;
    messageSid: z.ZodString;
    direction: z.ZodEnum<["INBOUND", "OUTBOUND"]>;
    content: z.ZodString;
    intent: z.ZodOptional<z.ZodString>;
    entities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    processedAt: z.ZodOptional<z.ZodDate>;
    responseSent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    content: string;
    messageSid: string;
    direction: "INBOUND" | "OUTBOUND";
    responseSent: boolean;
    intent?: string | undefined;
    entities?: Record<string, any> | undefined;
    processedAt?: Date | undefined;
    whatsappUserId?: string | undefined;
}, {
    tenantId: string;
    content: string;
    messageSid: string;
    direction: "INBOUND" | "OUTBOUND";
    intent?: string | undefined;
    entities?: Record<string, any> | undefined;
    processedAt?: Date | undefined;
    responseSent?: boolean | undefined;
    whatsappUserId?: string | undefined;
}>;
export declare const UpdateWhatsAppMessageSchema: z.ZodObject<{
    intent: z.ZodOptional<z.ZodString>;
    entities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    processedAt: z.ZodOptional<z.ZodDate>;
    responseSent: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    intent?: string | undefined;
    entities?: Record<string, any> | undefined;
    processedAt?: Date | undefined;
    responseSent?: boolean | undefined;
}, {
    intent?: string | undefined;
    entities?: Record<string, any> | undefined;
    processedAt?: Date | undefined;
    responseSent?: boolean | undefined;
}>;
export declare const MessageQuerySchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    whatsappUserId: z.ZodOptional<z.ZodString>;
    direction: z.ZodOptional<z.ZodEnum<["INBOUND", "OUTBOUND"]>>;
    intent: z.ZodOptional<z.ZodString>;
    responseSent: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dateFrom: z.ZodOptional<z.ZodDate>;
    dateTo: z.ZodOptional<z.ZodDate>;
    includeUser: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    includeUser: boolean;
    tenantId?: string | undefined;
    intent?: string | undefined;
    direction?: "INBOUND" | "OUTBOUND" | undefined;
    responseSent?: boolean | undefined;
    whatsappUserId?: string | undefined;
    dateFrom?: Date | undefined;
    dateTo?: Date | undefined;
}, {
    tenantId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    intent?: string | undefined;
    direction?: "INBOUND" | "OUTBOUND" | undefined;
    responseSent?: boolean | undefined;
    whatsappUserId?: string | undefined;
    dateFrom?: Date | undefined;
    dateTo?: Date | undefined;
    includeUser?: boolean | undefined;
}>;
export declare const MessageStatsSchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    whatsappUserId: z.ZodOptional<z.ZodString>;
    period: z.ZodDefault<z.ZodOptional<z.ZodEnum<["day", "week", "month", "year"]>>>;
    groupBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["direction", "intent", "date"]>>>;
}, "strip", z.ZodTypeAny, {
    groupBy: "date" | "intent" | "direction";
    period: "year" | "week" | "day" | "month";
    tenantId?: string | undefined;
    whatsappUserId?: string | undefined;
}, {
    tenantId?: string | undefined;
    groupBy?: "date" | "intent" | "direction" | undefined;
    period?: "year" | "week" | "day" | "month" | undefined;
    whatsappUserId?: string | undefined;
}>;
export type CreateWhatsAppMessageInput = z.infer<typeof CreateWhatsAppMessageSchema>;
export type UpdateWhatsAppMessageInput = z.infer<typeof UpdateWhatsAppMessageSchema>;
export type MessageQuery = z.infer<typeof MessageQuerySchema>;
export type MessageStatsQuery = z.infer<typeof MessageStatsSchema>;
export type WhatsAppMessageWithRelations = WhatsAppMessage & {
    whatsappUser?: WhatsAppUser;
    tenant?: Tenant;
};
export interface MessageStats {
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    processedMessages: number;
    unprocessedMessages: number;
    avgProcessingTime?: number;
    intentBreakdown: Array<{
        intent: string;
        count: number;
    }>;
    dailyVolume: Array<{
        date: string;
        count: number;
    }>;
}
export declare class WhatsAppMessageModel {
    static create(data: CreateWhatsAppMessageInput): Promise<WhatsAppMessage>;
    static findById(id: string, options?: {
        includeUser?: boolean;
    }): Promise<WhatsAppMessageWithRelations | null>;
    static findBySid(messageSid: string, options?: {
        includeUser?: boolean;
    }): Promise<WhatsAppMessageWithRelations | null>;
    static findMany(query: MessageQuery): Promise<{
        messages: WhatsAppMessageWithRelations[];
        total: number;
        hasMore: boolean;
    }>;
    static update(id: string, data: UpdateWhatsAppMessageInput): Promise<WhatsAppMessage>;
    static markAsProcessed(id: string, intent?: string, entities?: Record<string, any>): Promise<WhatsAppMessage>;
    static markResponseSent(id: string): Promise<WhatsAppMessage>;
    static getUnprocessed(tenantId?: string, limit?: number): Promise<WhatsAppMessageWithRelations[]>;
    static getByWhatsAppUser(whatsappUserId: string, options?: {
        direction?: MessageDirection;
        limit?: number;
        offset?: number;
    }): Promise<WhatsAppMessage[]>;
    static getConversation(whatsappUserId: string, limit?: number, offset?: number): Promise<WhatsAppMessage[]>;
    static getStats(query: MessageStatsQuery): Promise<MessageStats>;
    static deleteOlderThan(days: number): Promise<number>;
    static getRecentForTenant(tenantId: string, limit?: number): Promise<WhatsAppMessageWithRelations[]>;
    static search(query: string, tenantId?: string, limit?: number): Promise<WhatsAppMessageWithRelations[]>;
    static bulkUpdate(messageIds: string[], data: UpdateWhatsAppMessageInput): Promise<number>;
}
//# sourceMappingURL=whatsapp-message.d.ts.map