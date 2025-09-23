import { PrismaClient, WhatsAppUser, User, Tenant } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const CreateWhatsAppUserSchema = z.object({
  tenantId: z.string().cuid(),
  userId: z.string().cuid(),
  phoneNumber: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format'),
  whatsappNumber: z.string().regex(/^\+\d{10,15}$/, 'Invalid WhatsApp number format'),
  preferences: z.record(z.any()).optional().default({}),
});

export const UpdateWhatsAppUserSchema = z.object({
  isVerified: z.boolean().optional(),
  verificationCode: z.string().length(6).optional(),
  verificationExpiresAt: z.date().optional(),
  preferences: z.record(z.any()).optional(),
});

export const WhatsAppUserQuerySchema = z.object({
  tenantId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  phoneNumber: z.string().optional(),
  isVerified: z.boolean().optional(),
  includeUser: z.boolean().optional().default(false),
  includeTenant: z.boolean().optional().default(false),
});

// Types
export type CreateWhatsAppUserInput = z.infer<typeof CreateWhatsAppUserSchema>;
export type UpdateWhatsAppUserInput = z.infer<typeof UpdateWhatsAppUserSchema>;
export type WhatsAppUserQuery = z.infer<typeof WhatsAppUserQuerySchema>;

export type WhatsAppUserWithRelations = WhatsAppUser & {
  user?: User;
  tenant?: Tenant;
};

export class WhatsAppUserModel {
  /**
   * Create a new WhatsApp user
   */
  static async create(data: CreateWhatsAppUserInput): Promise<WhatsAppUser> {
    const validatedData = CreateWhatsAppUserSchema.parse(data);

    // Check if phone number is already linked
    const existing = await prisma.whatsAppUser.findUnique({
      where: { phoneNumber: validatedData.phoneNumber },
    });

    if (existing) {
      throw new Error('Phone number already linked to another account');
    }

    // Verify user exists and belongs to tenant
    const user = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        tenantId: validatedData.tenantId,
      },
    });

    if (!user) {
      throw new Error('User not found or does not belong to tenant');
    }

    return await prisma.whatsAppUser.create({
      data: {
        ...validatedData,
        preferences: validatedData.preferences || {},
      },
    });
  }

  /**
   * Find WhatsApp user by ID
   */
  static async findById(
    id: string,
    options: { includeUser?: boolean; includeTenant?: boolean } = {}
  ): Promise<WhatsAppUserWithRelations | null> {
    return await prisma.whatsAppUser.findUnique({
      where: { id },
      include: {
        user: options.includeUser || false,
        tenant: options.includeTenant || false,
      },
    });
  }

  /**
   * Find WhatsApp user by phone number
   */
  static async findByPhone(
    phoneNumber: string,
    options: { includeUser?: boolean; includeTenant?: boolean } = {}
  ): Promise<WhatsAppUserWithRelations | null> {
    return await prisma.whatsAppUser.findUnique({
      where: { phoneNumber },
      include: {
        user: options.includeUser || false,
        tenant: options.includeTenant || false,
      },
    });
  }

  /**
   * Find WhatsApp user by user ID and tenant ID
   */
  static async findByUserAndTenant(
    userId: string,
    tenantId: string,
    options: { includeUser?: boolean; includeTenant?: boolean } = {}
  ): Promise<WhatsAppUserWithRelations | null> {
    return await prisma.whatsAppUser.findFirst({
      where: {
        userId,
        tenantId,
      },
      include: {
        user: options.includeUser || false,
        tenant: options.includeTenant || false,
      },
    });
  }

  /**
   * Update WhatsApp user
   */
  static async update(
    id: string,
    data: UpdateWhatsAppUserInput
  ): Promise<WhatsAppUser> {
    const validatedData = UpdateWhatsAppUserSchema.parse(data);

    const existing = await prisma.whatsAppUser.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('WhatsApp user not found');
    }

    return await prisma.whatsAppUser.update({
      where: { id },
      data: validatedData,
    });
  }

  /**
   * Delete WhatsApp user
   */
  static async delete(id: string): Promise<void> {
    const existing = await prisma.whatsAppUser.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('WhatsApp user not found');
    }

    await prisma.whatsAppUser.delete({
      where: { id },
    });
  }

  /**
   * Verify user with code
   */
  static async verifyWithCode(
    phoneNumber: string,
    code: string
  ): Promise<boolean> {
    const whatsappUser = await prisma.whatsAppUser.findUnique({
      where: { phoneNumber },
    });

    if (!whatsappUser || !whatsappUser.verificationCode || !whatsappUser.verificationExpiresAt) {
      return false;
    }

    // Check if code matches and hasn't expired
    const isCodeValid = whatsappUser.verificationCode === code;
    const isNotExpired = whatsappUser.verificationExpiresAt > new Date();

    if (isCodeValid && isNotExpired) {
      // Mark as verified and clear verification data
      await prisma.whatsAppUser.update({
        where: { id: whatsappUser.id },
        data: {
          isVerified: true,
          verificationCode: null,
          verificationExpiresAt: null,
        },
      });

      return true;
    }

    return false;
  }

  /**
   * Generate and set verification code
   */
  static async generateVerificationCode(phoneNumber: string): Promise<string | null> {
    const whatsappUser = await prisma.whatsAppUser.findUnique({
      where: { phoneNumber },
    });

    if (!whatsappUser) {
      return null;
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.whatsAppUser.update({
      where: { id: whatsappUser.id },
      data: {
        verificationCode: code,
        verificationExpiresAt: expiresAt,
      },
    });

    return code;
  }

  /**
   * Find verified WhatsApp users by tenant
   */
  static async findVerifiedByTenant(
    tenantId: string,
    options: { includeUser?: boolean } = {}
  ): Promise<WhatsAppUserWithRelations[]> {
    return await prisma.whatsAppUser.findMany({
      where: {
        tenantId,
        isVerified: true,
      },
      include: {
        user: options.includeUser || false,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    id: string,
    preferences: Record<string, any>
  ): Promise<WhatsAppUser> {
    const existing = await prisma.whatsAppUser.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('WhatsApp user not found');
    }

    // Merge with existing preferences
    const updatedPreferences = {
      ...(existing.preferences as Record<string, any>),
      ...preferences,
    };

    return await prisma.whatsAppUser.update({
      where: { id },
      data: { preferences: updatedPreferences },
    });
  }

  /**
   * Check if phone number is available
   */
  static async isPhoneAvailable(phoneNumber: string): Promise<boolean> {
    const existing = await prisma.whatsAppUser.findUnique({
      where: { phoneNumber },
    });

    return !existing;
  }

  /**
   * Get user statistics
   */
  static async getStats(userId: string, tenantId: string): Promise<{
    isLinked: boolean;
    isVerified: boolean;
    messageCount: number;
    lastActivity: Date | null;
  }> {
    const whatsappUser = await prisma.whatsAppUser.findFirst({
      where: { userId, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      isLinked: !!whatsappUser,
      isVerified: whatsappUser?.isVerified || false,
      messageCount: whatsappUser?._count.messages || 0,
      lastActivity: whatsappUser?.messages[0]?.createdAt || null,
    };
  }

  /**
   * Bulk update verification status (admin function)
   */
  static async bulkUpdateVerification(
    tenantId: string,
    userIds: string[],
    isVerified: boolean
  ): Promise<number> {
    const result = await prisma.whatsAppUser.updateMany({
      where: {
        tenantId,
        userId: { in: userIds },
      },
      data: { isVerified },
    });

    return result.count;
  }

  /**
   * Clean up expired verification codes
   */
  static async cleanupExpiredCodes(): Promise<number> {
    const result = await prisma.whatsAppUser.updateMany({
      where: {
        verificationExpiresAt: {
          lt: new Date(),
        },
        verificationCode: {
          not: null,
        },
      },
      data: {
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });

    return result.count;
  }
}