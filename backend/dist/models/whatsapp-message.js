"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppMessageModel = exports.MessageStatsSchema = exports.MessageQuerySchema = exports.UpdateWhatsAppMessageSchema = exports.CreateWhatsAppMessageSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
exports.CreateWhatsAppMessageSchema = zod_1.z.object({
    tenantId: zod_1.z.string().cuid(),
    whatsappUserId: zod_1.z.string().cuid().optional(),
    messageSid: zod_1.z.string().min(1),
    direction: zod_1.z.enum(['INBOUND', 'OUTBOUND']),
    content: zod_1.z.string().min(1).max(4096),
    intent: zod_1.z.string().optional(),
    entities: zod_1.z.record(zod_1.z.any()).optional(),
    processedAt: zod_1.z.date().optional(),
    responseSent: zod_1.z.boolean().optional().default(false),
});
exports.UpdateWhatsAppMessageSchema = zod_1.z.object({
    intent: zod_1.z.string().optional(),
    entities: zod_1.z.record(zod_1.z.any()).optional(),
    processedAt: zod_1.z.date().optional(),
    responseSent: zod_1.z.boolean().optional(),
});
exports.MessageQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().cuid().optional(),
    whatsappUserId: zod_1.z.string().cuid().optional(),
    direction: zod_1.z.enum(['INBOUND', 'OUTBOUND']).optional(),
    intent: zod_1.z.string().optional(),
    responseSent: zod_1.z.boolean().optional(),
    limit: zod_1.z.number().int().positive().max(100).optional().default(50),
    offset: zod_1.z.number().int().nonnegative().optional().default(0),
    dateFrom: zod_1.z.date().optional(),
    dateTo: zod_1.z.date().optional(),
    includeUser: zod_1.z.boolean().optional().default(false),
});
exports.MessageStatsSchema = zod_1.z.object({
    tenantId: zod_1.z.string().cuid().optional(),
    whatsappUserId: zod_1.z.string().cuid().optional(),
    period: zod_1.z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
    groupBy: zod_1.z.enum(['direction', 'intent', 'date']).optional().default('direction'),
});
class WhatsAppMessageModel {
    static async create(data) {
        const validatedData = exports.CreateWhatsAppMessageSchema.parse(data);
        const existing = await prisma.whatsAppMessage.findUnique({
            where: { messageSid: validatedData.messageSid },
        });
        if (existing) {
            throw new Error('Message with this SID already exists');
        }
        return await prisma.whatsAppMessage.create({
            data: {
                ...validatedData,
                entities: validatedData.entities || {},
            },
        });
    }
    static async findById(id, options = {}) {
        return await prisma.whatsAppMessage.findUnique({
            where: { id },
            include: {
                whatsappUser: options.includeUser || false,
            },
        });
    }
    static async findBySid(messageSid, options = {}) {
        return await prisma.whatsAppMessage.findUnique({
            where: { messageSid },
            include: {
                whatsappUser: options.includeUser || false,
            },
        });
    }
    static async findMany(query) {
        const validatedQuery = exports.MessageQuerySchema.parse(query);
        const where = {};
        if (validatedQuery.tenantId) {
            where.tenantId = validatedQuery.tenantId;
        }
        if (validatedQuery.whatsappUserId) {
            where.whatsappUserId = validatedQuery.whatsappUserId;
        }
        if (validatedQuery.direction) {
            where.direction = validatedQuery.direction;
        }
        if (validatedQuery.intent) {
            where.intent = validatedQuery.intent;
        }
        if (validatedQuery.responseSent !== undefined) {
            where.responseSent = validatedQuery.responseSent;
        }
        if (validatedQuery.dateFrom || validatedQuery.dateTo) {
            where.createdAt = {};
            if (validatedQuery.dateFrom) {
                where.createdAt.gte = validatedQuery.dateFrom;
            }
            if (validatedQuery.dateTo) {
                where.createdAt.lte = validatedQuery.dateTo;
            }
        }
        const [messages, total] = await Promise.all([
            prisma.whatsAppMessage.findMany({
                where,
                include: {
                    whatsappUser: validatedQuery.includeUser,
                },
                orderBy: { createdAt: 'desc' },
                take: validatedQuery.limit,
                skip: validatedQuery.offset,
            }),
            prisma.whatsAppMessage.count({ where }),
        ]);
        return {
            messages,
            total,
            hasMore: validatedQuery.offset + messages.length < total,
        };
    }
    static async update(id, data) {
        const validatedData = exports.UpdateWhatsAppMessageSchema.parse(data);
        const existing = await prisma.whatsAppMessage.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new Error('Message not found');
        }
        return await prisma.whatsAppMessage.update({
            where: { id },
            data: validatedData,
        });
    }
    static async markAsProcessed(id, intent, entities) {
        return await prisma.whatsAppMessage.update({
            where: { id },
            data: {
                processedAt: new Date(),
                intent,
                entities,
            },
        });
    }
    static async markResponseSent(id) {
        return await prisma.whatsAppMessage.update({
            where: { id },
            data: {
                responseSent: true,
            },
        });
    }
    static async getUnprocessed(tenantId, limit = 50) {
        const where = {
            direction: 'INBOUND',
            processedAt: null,
        };
        if (tenantId) {
            where.tenantId = tenantId;
        }
        return await prisma.whatsAppMessage.findMany({
            where,
            include: {
                whatsappUser: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }
    static async getByWhatsAppUser(whatsappUserId, options = {}) {
        const where = { whatsappUserId };
        if (options.direction) {
            where.direction = options.direction;
        }
        return await prisma.whatsAppMessage.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options.limit || 50,
            skip: options.offset || 0,
        });
    }
    static async getConversation(whatsappUserId, limit = 50, offset = 0) {
        return await prisma.whatsAppMessage.findMany({
            where: { whatsappUserId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }
    static async getStats(query) {
        const validatedQuery = exports.MessageStatsSchema.parse(query);
        const where = {};
        if (validatedQuery.tenantId) {
            where.tenantId = validatedQuery.tenantId;
        }
        if (validatedQuery.whatsappUserId) {
            where.whatsappUserId = validatedQuery.whatsappUserId;
        }
        const now = new Date();
        let startDate;
        switch (validatedQuery.period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }
        where.createdAt = { gte: startDate };
        const [totalMessages, inboundMessages, outboundMessages, processedMessages, intentStats, dailyStats,] = await Promise.all([
            prisma.whatsAppMessage.count({ where }),
            prisma.whatsAppMessage.count({ where: { ...where, direction: 'INBOUND' } }),
            prisma.whatsAppMessage.count({ where: { ...where, direction: 'OUTBOUND' } }),
            prisma.whatsAppMessage.count({ where: { ...where, processedAt: { not: null } } }),
            prisma.whatsAppMessage.groupBy({
                by: ['intent'],
                where: { ...where, intent: { not: null } },
                _count: true,
            }),
            prisma.$queryRaw `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM whatsapp_messages
        WHERE created_at >= ${startDate}
        ${validatedQuery.tenantId ? `AND tenant_id = '${validatedQuery.tenantId}'` : ''}
        ${validatedQuery.whatsappUserId ? `AND whatsapp_user_id = '${validatedQuery.whatsappUserId}'` : ''}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `,
        ]);
        const processingTimes = await prisma.whatsAppMessage.findMany({
            where: {
                ...where,
                direction: 'INBOUND',
                processedAt: { not: null },
            },
            select: {
                createdAt: true,
                processedAt: true,
            },
        });
        const avgProcessingTime = processingTimes.length > 0
            ? processingTimes.reduce((sum, msg) => {
                const diff = msg.processedAt.getTime() - msg.createdAt.getTime();
                return sum + diff;
            }, 0) / processingTimes.length / 1000
            : undefined;
        return {
            totalMessages,
            inboundMessages,
            outboundMessages,
            processedMessages,
            unprocessedMessages: inboundMessages - processedMessages,
            avgProcessingTime,
            intentBreakdown: intentStats.map(stat => ({
                intent: stat.intent || 'unknown',
                count: stat._count,
            })),
            dailyVolume: dailyStats.map(stat => ({
                date: stat.date,
                count: Number(stat.count),
            })),
        };
    }
    static async deleteOlderThan(days) {
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const result = await prisma.whatsAppMessage.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });
        return result.count;
    }
    static async getRecentForTenant(tenantId, limit = 10) {
        return await prisma.whatsAppMessage.findMany({
            where: { tenantId },
            include: {
                whatsappUser: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    static async search(query, tenantId, limit = 50) {
        const where = {
            content: {
                contains: query,
                mode: 'insensitive',
            },
        };
        if (tenantId) {
            where.tenantId = tenantId;
        }
        return await prisma.whatsAppMessage.findMany({
            where,
            include: {
                whatsappUser: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    static async bulkUpdate(messageIds, data) {
        const validatedData = exports.UpdateWhatsAppMessageSchema.parse(data);
        const result = await prisma.whatsAppMessage.updateMany({
            where: {
                id: { in: messageIds },
            },
            data: validatedData,
        });
        return result.count;
    }
}
exports.WhatsAppMessageModel = WhatsAppMessageModel;
//# sourceMappingURL=whatsapp-message.js.map