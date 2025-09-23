"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_dto_1 = require("./auth.dto");
class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async sendMagicLink(request, reply) {
        try {
            const validation = auth_dto_1.sendMagicLinkSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    message: 'Validation error',
                    errors: validation.error.errors
                });
            }
            const { email, tenantId } = validation.data;
            const result = await this.authService.sendMagicLink(email, tenantId);
            if (result.success) {
                return reply.status(200).send(result);
            }
            else {
                return reply.status(400).send(result);
            }
        }
        catch (error) {
            console.error('Error in sendMagicLink:', error);
            return reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async verifyMagicLink(request, reply) {
        try {
            const validation = auth_dto_1.verifyMagicLinkSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    message: 'Validation error',
                    errors: validation.error.errors
                });
            }
            const { token, tenantId } = validation.data;
            const result = await this.authService.verifyMagicLink(token, tenantId);
            if (result.success) {
                return reply.status(200).send({
                    success: true,
                    message: result.message,
                    user: {
                        id: result.user?.id,
                        email: result.user?.email,
                        firstName: result.user?.firstName,
                        lastName: result.user?.lastName,
                        tenantId: result.user?.tenantId
                    },
                    tokens: result.tokens
                });
            }
            else {
                return reply.status(401).send(result);
            }
        }
        catch (error) {
            console.error('Error in verifyMagicLink:', error);
            return reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async refreshTokens(request, reply) {
        try {
            const validation = auth_dto_1.refreshTokenSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    message: 'Validation error',
                    errors: validation.error.errors
                });
            }
            const { refreshToken, tenantId } = validation.data;
            const result = await this.authService.refreshTokens(refreshToken, tenantId);
            if (result.success) {
                return reply.status(200).send(result);
            }
            else {
                return reply.status(401).send(result);
            }
        }
        catch (error) {
            console.error('Error in refreshTokens:', error);
            return reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async getCurrentUser(request, reply) {
        try {
            const userInfo = request.user;
            if (!userInfo) {
                return reply.status(401).send({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            const user = await this.authService.getCurrentUser(userInfo.userId, userInfo.tenantId);
            if (!user) {
                return reply.status(404).send({
                    success: false,
                    message: 'User not found'
                });
            }
            return reply.status(200).send({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    tenantId: user.tenantId,
                    role: user.role,
                    isActive: user.isActive,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            });
        }
        catch (error) {
            console.error('Error in getCurrentUser:', error);
            return reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async updateProfile(request, reply) {
        try {
            const validation = auth_dto_1.updateProfileSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({
                    success: false,
                    message: 'Validation error',
                    errors: validation.error.errors
                });
            }
            const userInfo = request.user;
            if (!userInfo) {
                return reply.status(401).send({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            const updatedUser = await this.authService.updateUserProfile(userInfo.userId, userInfo.tenantId, validation.data);
            if (!updatedUser) {
                return reply.status(404).send({
                    success: false,
                    message: 'User not found'
                });
            }
            return reply.status(200).send({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    firstName: updatedUser.firstName,
                    lastName: updatedUser.lastName,
                    tenantId: updatedUser.tenantId
                }
            });
        }
        catch (error) {
            console.error('Error in updateProfile:', error);
            return reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async logout(request, reply) {
        try {
            const userInfo = request.user;
            if (!userInfo) {
                return reply.status(401).send({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            await this.authService.logout(userInfo.userId, userInfo.tenantId);
            return reply.status(200).send({
                success: true,
                message: 'Logged out successfully'
            });
        }
        catch (error) {
            console.error('Error in logout:', error);
            return reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
    async deleteAccount(request, reply) {
        try {
            const userInfo = request.user;
            if (!userInfo) {
                return reply.status(401).send({
                    success: false,
                    message: 'Unauthorized'
                });
            }
            const deleted = await this.authService.deleteAccount(userInfo.userId, userInfo.tenantId);
            if (deleted) {
                return reply.status(200).send({
                    success: true,
                    message: 'Account deleted successfully'
                });
            }
            else {
                return reply.status(400).send({
                    success: false,
                    message: 'Failed to delete account'
                });
            }
        }
        catch (error) {
            console.error('Error in deleteAccount:', error);
            return reply.status(500).send({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map