"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
async function authRoutes(fastify) {
    const authController = new auth_controller_1.AuthController(fastify.authService);
    fastify.post('/auth/send-magic-link', {
        schema: {
            tags: ['Authentication'],
            summary: 'Send magic link for authentication',
            body: {
                type: 'object',
                required: ['email', 'tenantId'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    tenantId: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, authController.sendMagicLink.bind(authController));
    fastify.post('/auth/verify-magic-link', {
        schema: {
            tags: ['Authentication'],
            summary: 'Verify magic link and authenticate user',
            body: {
                type: 'object',
                required: ['token', 'tenantId'],
                properties: {
                    token: { type: 'string' },
                    tenantId: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                firstName: { type: 'string' },
                                lastName: { type: 'string' },
                                tenantId: { type: 'string' }
                            }
                        },
                        tokens: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, authController.verifyMagicLink.bind(authController));
    fastify.post('/auth/refresh', {
        schema: {
            tags: ['Authentication'],
            summary: 'Refresh access token using refresh token',
            body: {
                type: 'object',
                required: ['refreshToken', 'tenantId'],
                properties: {
                    refreshToken: { type: 'string' },
                    tenantId: { type: 'string', format: 'uuid' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        tokens: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, authController.refreshTokens.bind(authController));
    fastify.register(async function (fastify) {
        fastify.addHook('preHandler', auth_middleware_1.authMiddleware);
        fastify.get('/auth/me', {
            schema: {
                tags: ['Authentication'],
                summary: 'Get current authenticated user',
                security: [{ bearerAuth: [] }],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    email: { type: 'string' },
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' },
                                    tenantId: { type: 'string' },
                                    role: { type: 'string' },
                                    isActive: { type: 'boolean' },
                                    createdAt: { type: 'string' },
                                    updatedAt: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }, authController.getCurrentUser.bind(authController));
        fastify.put('/auth/profile', {
            schema: {
                tags: ['Authentication'],
                summary: 'Update user profile',
                security: [{ bearerAuth: [] }],
                body: {
                    type: 'object',
                    properties: {
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        timezone: { type: 'string' }
                    }
                },
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' },
                            user: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    email: { type: 'string' },
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' },
                                    tenantId: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }, authController.updateProfile.bind(authController));
        fastify.post('/auth/logout', {
            schema: {
                tags: ['Authentication'],
                summary: 'Logout and invalidate sessions',
                security: [{ bearerAuth: [] }],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, authController.logout.bind(authController));
        fastify.delete('/auth/account', {
            schema: {
                tags: ['Authentication'],
                summary: 'Delete user account',
                security: [{ bearerAuth: [] }],
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }, authController.deleteAccount.bind(authController));
    });
}
//# sourceMappingURL=auth.routes.js.map