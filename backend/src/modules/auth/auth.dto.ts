import { z } from 'zod';

export const sendMagicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantId: z.string().uuid('Invalid tenant ID')
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  tenantId: z.string().uuid('Invalid tenant ID')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  tenantId: z.string().uuid('Invalid tenant ID')
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  timezone: z.string().optional()
});

export type SendMagicLinkRequest = z.infer<typeof sendMagicLinkSchema>;
export type VerifyMagicLinkRequest = z.infer<typeof verifyMagicLinkSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;