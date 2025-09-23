import { z } from 'zod';
export declare const sendMagicLinkSchema: z.ZodObject<{
    email: z.ZodString;
    tenantId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    email: string;
}, {
    tenantId: string;
    email: string;
}>;
export declare const verifyMagicLinkSchema: z.ZodObject<{
    token: z.ZodString;
    tenantId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    token: string;
}, {
    tenantId: string;
    token: string;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
    tenantId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    refreshToken: string;
}, {
    tenantId: string;
    refreshToken: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phoneNumber: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    timezone?: string | undefined;
    phoneNumber?: string | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    timezone?: string | undefined;
    phoneNumber?: string | undefined;
}>;
export type SendMagicLinkRequest = z.infer<typeof sendMagicLinkSchema>;
export type VerifyMagicLinkRequest = z.infer<typeof verifyMagicLinkSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;
//# sourceMappingURL=auth.dto.d.ts.map