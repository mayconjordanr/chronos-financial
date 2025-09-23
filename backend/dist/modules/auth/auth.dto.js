"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.refreshTokenSchema = exports.verifyMagicLinkSchema = exports.sendMagicLinkSchema = void 0;
const zod_1 = require("zod");
exports.sendMagicLinkSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    tenantId: zod_1.z.string().uuid('Invalid tenant ID')
});
exports.verifyMagicLinkSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    tenantId: zod_1.z.string().uuid('Invalid tenant ID')
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
    tenantId: zod_1.z.string().uuid('Invalid tenant ID')
});
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    phoneNumber: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional()
});
//# sourceMappingURL=auth.dto.js.map