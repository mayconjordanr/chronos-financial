import { PrismaClient, WhatsAppMessage, WhatsAppUser, Tenant, MessageDirection } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const CreateWhatsAppMessageSchema = z.object({
  tenantId: z.string().cuid(),
  whatsappUserId: z.string().cuid().optional(),
  messageSid: z.string().min(1),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  content: z.string().min(1).max(4096),
  intent: z.string().optional(),
  entities: z.record(z.any()).optional(),
  processedAt: z.date().optional(),
  responseSent: z.boolean().optional().default(false),
});

export const UpdateWhatsAppMessageSchema = z.object({
  intent: z.string().optional(),
  entities: z.record(z.any()).optional(),
  processedAt: z.date().optional(),
  responseSent: z.boolean().optional(),
});

export const MessageQuerySchema = z.object({
  tenantId: z.string().cuid().optional(),
  whatsappUserId: z.string().cuid().optional(),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  intent: z.string().optional(),
  responseSent: z.boolean().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  includeUser: z.boolean().optional().default(false),
});

export const MessageStatsSchema = z.object({
  tenantId: z.string().cuid().optional(),
  whatsappUserId: z.string().cuid().optional(),
  period: z.enum(['day', 'week', 'month', 'year']).optional().default('month'),
  groupBy: z.enum(['direction', 'intent', 'date']).optional().default('direction'),
});

// Types
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
  intentBreakdown: Array<{ intent: string; count: number }>;
  dailyVolume: Array<{ date: string; count: number }>;
}

export class WhatsAppMessageModel {
  /**
   * Create a new WhatsApp message
   */
  static async create(data: CreateWhatsAppMessageInput): Promise<WhatsAppMessage> {
    const validatedData = CreateWhatsAppMessageSchema.parse(data);

    // Check for duplicate message SID
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

  /**
   * Find message by ID
   */
  static async findById(
    id: string,
    options: { includeUser?: boolean } = {}
  ): Promise<WhatsAppMessageWithRelations | null> {
    return await prisma.whatsAppMessage.findUnique({
      where: { id },
      include: {
        whatsappUser: options.includeUser || false,
      },
    });
  }

  /**
   * Find message by Twilio SID
   */
  static async findBySid(
    messageSid: string,
    options: { includeUser?: boolean } = {}
  ): Promise<WhatsAppMessageWithRelations | null> {
    return await prisma.whatsAppMessage.findUnique({
      where: { messageSid },
      include: {
        whatsappUser: options.includeUser || false,
      },
    });
  }

  /**
   * Find messages with pagination and filtering
   */
  static async findMany(query: MessageQuery): Promise<{
    messages: WhatsAppMessageWithRelations[];
    total: number;
    hasMore: boolean;
  }> {
    const validatedQuery = MessageQuerySchema.parse(query);

    const where: any = {};

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

  /**
   * Update message
   */
  static async update(
    id: string,
    data: UpdateWhatsAppMessageInput
  ): Promise<WhatsAppMessage> {
    const validatedData = UpdateWhatsAppMessageSchema.parse(data);

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

  /**
   * Mark message as processed
   */
  static async markAsProcessed(
    id: string,
    intent?: string,
    entities?: Record<string, any>
  ): Promise<WhatsAppMessage> {
    return await prisma.whatsAppMessage.update({
      where: { id },
      data: {
        processedAt: new Date(),
        intent,
        entities,
      },
    });
  }

  /**
   * Mark response as sent
   */
  static async markResponseSent(id: string): Promise<WhatsAppMessage> {
    return await prisma.whatsAppMessage.update({
      where: { id },
      data: {
        responseSent: true,
      },
    });
  }

  /**
   * Get unprocessed messages
   */
  static async getUnprocessed(
    tenantId?: string,
    limit: number = 50
  ): Promise<WhatsAppMessageWithRelations[]> {
    const where: any = {
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

  /**
   * Get messages by WhatsApp user
   */
  static async getByWhatsAppUser(
    whatsappUserId: string,
    options: {
      direction?: MessageDirection;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<WhatsAppMessage[]> {
    const where: any = { whatsappUserId };

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

  /**
   * Get conversation history
   */
  static async getConversation(
    whatsappUserId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WhatsAppMessage[]> {
    return await prisma.whatsAppMessage.findMany({
      where: { whatsappUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get message statistics
   */
  static async getStats(query: MessageStatsQuery): Promise<MessageStats> {
    const validatedQuery = MessageStatsSchema.parse(query);

    const where: any = {};

    if (validatedQuery.tenantId) {
      where.tenantId = validatedQuery.tenantId;
    }

    if (validatedQuery.whatsappUserId) {
      where.whatsappUserId = validatedQuery.whatsappUserId;
    }

    // Set date range based on period
    const now = new Date();
    let startDate: Date;

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

    const [
      totalMessages,
      inboundMessages,
      outboundMessages,
      processedMessages,
      intentStats,
      dailyStats,
    ] = await Promise.all([
      prisma.whatsAppMessage.count({ where }),
      prisma.whatsAppMessage.count({ where: { ...where, direction: 'INBOUND' } }),
      prisma.whatsAppMessage.count({ where: { ...where, direction: 'OUTBOUND' } }),
      prisma.whatsAppMessage.count({ where: { ...where, processedAt: { not: null } } }),

      // Intent breakdown
      prisma.whatsAppMessage.groupBy({
        by: ['intent'],
        where: { ...where, intent: { not: null } },
        _count: true,
      }),

      // Daily volume
      prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
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

    // Calculate average processing time for processed messages
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
          const diff = msg.processedAt!.getTime() - msg.createdAt.getTime();
          return sum + diff;
        }, 0) / processingTimes.length / 1000 // Convert to seconds
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

  /**
   * Delete old messages (cleanup)
   */
  static async deleteOlderThan(days: number): Promise<number> {
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

  /**
   * Get recent messages for a tenant
   */
  static async getRecentForTenant(
    tenantId: string,
    limit: number = 10
  ): Promise<WhatsAppMessageWithRelations[]> {
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

  /**
   * Search messages by content
   */
  static async search(
    query: string,
    tenantId?: string,
    limit: number = 50
  ): Promise<WhatsAppMessageWithRelations[]> {
    const where: any = {
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

  /**
   * Bulk update messages
   */
  static async bulkUpdate(
    messageIds: string[],
    data: UpdateWhatsAppMessageInput
  ): Promise<number> {
    const validatedData = UpdateWhatsAppMessageSchema.parse(data);

    const result = await prisma.whatsAppMessage.updateMany({
      where: {
        id: { in: messageIds },
      },
      data: validatedData,
    });

    return result.count;
  }
}