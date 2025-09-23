import { WhatsAppUser, User, Tenant } from '@prisma/client';
import { z } from 'zod';
export declare const CreateWhatsAppUserSchema: z.ZodObject<{
    tenantId: z.ZodString;
    userId: z.ZodString;
    phoneNumber: z.ZodString;
    whatsappNumber: z.ZodString;
    preferences: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    phoneNumber: string;
    whatsappNumber: string;
    preferences: Record<string, any>;
}, {
    tenantId: string;
    userId: string;
    phoneNumber: string;
    whatsappNumber: string;
    preferences?: Record<string, any> | undefined;
}>;
export declare const UpdateWhatsAppUserSchema: z.ZodObject<{
    isVerified: z.ZodOptional<z.ZodBoolean>;
    verificationCode: z.ZodOptional<z.ZodString>;
    verificationExpiresAt: z.ZodOptional<z.ZodDate>;
    preferences: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    preferences?: Record<string, any> | undefined;
    isVerified?: boolean | undefined;
    verificationCode?: string | undefined;
    verificationExpiresAt?: Date | undefined;
}, {
    preferences?: Record<string, any> | undefined;
    isVerified?: boolean | undefined;
    verificationCode?: string | undefined;
    verificationExpiresAt?: Date | undefined;
}>;
export declare const WhatsAppUserQuerySchema: z.ZodObject<{
    tenantId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    phoneNumber: z.ZodOptional<z.ZodString>;
    isVerified: z.ZodOptional<z.ZodBoolean>;
    includeUser: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeTenant: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    includeUser: boolean;
    includeTenant: boolean;
    tenantId?: string | undefined;
    userId?: string | undefined;
    phoneNumber?: string | undefined;
    isVerified?: boolean | undefined;
}, {
    tenantId?: string | undefined;
    userId?: string | undefined;
    phoneNumber?: string | undefined;
    includeUser?: boolean | undefined;
    isVerified?: boolean | undefined;
    includeTenant?: boolean | undefined;
}>;
export type CreateWhatsAppUserInput = z.infer<typeof CreateWhatsAppUserSchema>;
export type UpdateWhatsAppUserInput = z.infer<typeof UpdateWhatsAppUserSchema>;
export type WhatsAppUserQuery = z.infer<typeof WhatsAppUserQuerySchema>;
export type WhatsAppUserWithRelations = WhatsAppUser & {
    user?: User;
    tenant?: Tenant;
};
export declare class WhatsAppUserModel {
    static create(data: CreateWhatsAppUserInput): Promise<WhatsAppUser>;
    static findById(id: string, options?: {
        includeUser?: boolean;
        includeTenant?: boolean;
    }): Promise<WhatsAppUserWithRelations | null>;
    static findByPhone(phoneNumber: string, options?: {
        includeUser?: boolean;
        includeTenant?: boolean;
    }): Promise<WhatsAppUserWithRelations | null>;
    static findByUserAndTenant(userId: string, tenantId: string, options?: {
        includeUser?: boolean;
        includeTenant?: boolean;
    }): Promise<WhatsAppUserWithRelations | null>;
    static update(id: string, data: UpdateWhatsAppUserInput): Promise<WhatsAppUser>;
    static delete(id: string): Promise<void>;
    static verifyWithCode(phoneNumber: string, code: string): Promise<boolean>;
    static generateVerificationCode(phoneNumber: string): Promise<string | null>;
    static findVerifiedByTenant(tenantId: string, options?: {
        includeUser?: boolean;
    }): Promise<WhatsAppUserWithRelations[]>;
    static updatePreferences(id: string, preferences: Record<string, any>): Promise<WhatsAppUser>;
    static isPhoneAvailable(phoneNumber: string): Promise<boolean>;
    static getStats(userId: string, tenantId: string): Promise<{
        isLinked: boolean;
        isVerified: boolean;
        messageCount: number;
        lastActivity: Date | null;
    }>;
    static bulkUpdateVerification(tenantId: string, userIds: string[], isVerified: boolean): Promise<number>;
    static cleanupExpiredCodes(): Promise<number>;
}
//# sourceMappingURL=whatsapp-user.d.ts.map