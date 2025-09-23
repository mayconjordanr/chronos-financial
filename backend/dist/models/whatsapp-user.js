"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppUserModel = exports.WhatsAppUserQuerySchema = exports.UpdateWhatsAppUserSchema = exports.CreateWhatsAppUserSchema = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
exports.CreateWhatsAppUserSchema = zod_1.z.object({
    tenantId: zod_1.z.string().cuid(),
    userId: zod_1.z.string().cuid(),
    phoneNumber: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format'),
    whatsappNumber: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Invalid WhatsApp number format'),
    preferences: zod_1.z.record(zod_1.z.any()).optional().default({}),
});
exports.UpdateWhatsAppUserSchema = zod_1.z.object({
    isVerified: zod_1.z.boolean().optional(),
    verificationCode: zod_1.z.string().length(6).optional(),
    verificationExpiresAt: zod_1.z.date().optional(),
    preferences: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.WhatsAppUserQuerySchema = zod_1.z.object({
    tenantId: zod_1.z.string().cuid().optional(),
    userId: zod_1.z.string().cuid().optional(),
    phoneNumber: zod_1.z.string().optional(),
    isVerified: zod_1.z.boolean().optional(),
    includeUser: zod_1.z.boolean().optional().default(false),
    includeTenant: zod_1.z.boolean().optional().default(false),
});
class WhatsAppUserModel {
    static async create(data) {
        const validatedData = exports.CreateWhatsAppUserSchema.parse(data);
        const existing = await prisma.whatsAppUser.findUnique({
            where: { phoneNumber: validatedData.phoneNumber },
        });
        if (existing) {
            throw new Error('Phone number already linked to another account');
        }
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
    static async findById(id, options = {}) {
        return await prisma.whatsAppUser.findUnique({
            where: { id },
            include: {
                user: options.includeUser || false,
                tenant: options.includeTenant || false,
            },
        });
    }
    static async findByPhone(phoneNumber, options = {}) {
        return await prisma.whatsAppUser.findUnique({
            where: { phoneNumber },
            include: {
                user: options.includeUser || false,
                tenant: options.includeTenant || false,
            },
        });
    }
    static async findByUserAndTenant(userId, tenantId, options = {}) {
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
    static async update(id, data) {
        const validatedData = exports.UpdateWhatsAppUserSchema.parse(data);
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
    static async delete(id) {
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
    static async verifyWithCode(phoneNumber, code) {
        const whatsappUser = await prisma.whatsAppUser.findUnique({
            where: { phoneNumber },
        });
        if (!whatsappUser || !whatsappUser.verificationCode || !whatsappUser.verificationExpiresAt) {
            return false;
        }
        const isCodeValid = whatsappUser.verificationCode === code;
        const isNotExpired = whatsappUser.verificationExpiresAt > new Date();
        if (isCodeValid && isNotExpired) {
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
    static async generateVerificationCode(phoneNumber) {
        const whatsappUser = await prisma.whatsAppUser.findUnique({
            where: { phoneNumber },
        });
        if (!whatsappUser) {
            return null;
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await prisma.whatsAppUser.update({
            where: { id: whatsappUser.id },
            data: {
                verificationCode: code,
                verificationExpiresAt: expiresAt,
            },
        });
        return code;
    }
    static async findVerifiedByTenant(tenantId, options = {}) {
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
    static async updatePreferences(id, preferences) {
        const existing = await prisma.whatsAppUser.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new Error('WhatsApp user not found');
        }
        const updatedPreferences = {
            ...existing.preferences,
            ...preferences,
        };
        return await prisma.whatsAppUser.update({
            where: { id },
            data: { preferences: updatedPreferences },
        });
    }
    static async isPhoneAvailable(phoneNumber) {
        const existing = await prisma.whatsAppUser.findUnique({
            where: { phoneNumber },
        });
        return !existing;
    }
    static async getStats(userId, tenantId) {
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
    static async bulkUpdateVerification(tenantId, userIds, isVerified) {
        const result = await prisma.whatsAppUser.updateMany({
            where: {
                tenantId,
                userId: { in: userIds },
            },
            data: { isVerified },
        });
        return result.count;
    }
    static async cleanupExpiredCodes() {
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
exports.WhatsAppUserModel = WhatsAppUserModel;
//# sourceMappingURL=whatsapp-user.js.map