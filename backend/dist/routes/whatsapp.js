"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappRoutes = whatsappRoutes;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const webhook_1 = require("../services/whatsapp/webhook");
const client_2 = require("../services/whatsapp/client");
const whatsapp_auth_1 = require("../middleware/whatsapp-auth");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma = new client_1.PrismaClient();
const SendMessageSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format'),
    message: zod_1.z.string().min(1).max(4096),
    mediaUrl: zod_1.z.string().url().optional(),
});
const VerificationCodeSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format'),
});
const VerifyUserSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format'),
    code: zod_1.z.string().length(6, 'Verification code must be 6 digits'),
});
const LinkPhoneSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format'),
});
async function whatsappRoutes(fastify) {
    const webhookHandler = new webhook_1.WebhookHandler();
    fastify.setErrorHandler(whatsapp_auth_1.whatsAppErrorHandler);
    fastify.get('/webhook', {
        preHandler: [whatsapp_auth_1.handleWebhookVerification],
        handler: async (request, reply) => {
            reply.code(200).send('Webhook verified');
        },
    });
    fastify.post('/webhook', {
        preHandler: [
            whatsapp_auth_1.logWhatsAppRequest,
            whatsapp_auth_1.whatsAppWebhookSecurity,
            whatsapp_auth_1.validateWhatsAppPayload,
            whatsapp_auth_1.whatsAppRateLimit,
        ],
        handler: async (request, reply) => {
            try {
                const body = request.body;
                webhookHandler.processWebhook(body).catch(error => {
                    console.error('Async webhook processing error:', error);
                });
                reply.code(200).send({ status: 'received' });
            }
            catch (error) {
                console.error('Webhook handler error:', error);
                reply.code(200).send({ status: 'error' });
            }
        },
    });
    fastify.post('/send', {
        preHandler: [auth_middleware_1.authenticateToken],
        schema: {
            body: SendMessageSchema,
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        messageSid: { type: 'string' },
                        error: { type: 'string' },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            try {
                const { phoneNumber, message, mediaUrl } = request.body;
                const user = request.user;
                const whatsappUser = await prisma.whatsAppUser.findFirst({
                    where: {
                        phoneNumber,
                        tenantId: user.tenantId,
                        userId: user.id,
                        isVerified: true,
                    },
                });
                if (!whatsappUser) {
                    reply.code(403).send({
                        success: false,
                        error: 'Phone number not linked to your account or not verified',
                    });
                    return;
                }
                const result = await client_2.whatsAppClient.sendMessage({
                    to: phoneNumber,
                    body: message,
                    mediaUrl: mediaUrl ? [mediaUrl] : undefined,
                });
                if (result.errorCode) {
                    reply.code(400).send({
                        success: false,
                        error: result.errorMessage,
                    });
                    return;
                }
                await prisma.whatsAppMessage.create({
                    data: {
                        tenantId: user.tenantId,
                        whatsappUserId: whatsappUser.id,
                        messageSid: result.sid,
                        direction: 'OUTBOUND',
                        content: message,
                    },
                });
                reply.send({
                    success: true,
                    messageSid: result.sid,
                });
            }
            catch (error) {
                console.error('Send message error:', error);
                reply.code(500).send({
                    success: false,
                    error: 'Failed to send message',
                });
            }
        },
    });
    fastify.get('/status', {
        preHandler: [auth_middleware_1.authenticateToken],
        handler: async (request, reply) => {
            try {
                const user = request.user;
                const whatsappUser = await prisma.whatsAppUser.findFirst({
                    where: {
                        tenantId: user.tenantId,
                        userId: user.id,
                    },
                });
                const recentMessages = await prisma.whatsAppMessage.count({
                    where: {
                        tenantId: user.tenantId,
                        whatsappUserId: whatsappUser?.id,
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                        },
                    },
                });
                reply.send({
                    isLinked: !!whatsappUser,
                    isVerified: whatsappUser?.isVerified || false,
                    phoneNumber: whatsappUser?.phoneNumber,
                    whatsappNumber: whatsappUser?.whatsappNumber,
                    messagesLast24h: recentMessages,
                    lastActivity: whatsappUser?.updatedAt,
                });
            }
            catch (error) {
                console.error('Status check error:', error);
                reply.code(500).send({
                    error: 'Failed to check status',
                });
            }
        },
    });
    fastify.post('/link-phone', {
        preHandler: [auth_middleware_1.authenticateToken],
        schema: {
            body: LinkPhoneSchema,
        },
        handler: async (request, reply) => {
            try {
                const { phoneNumber } = request.body;
                const user = request.user;
                const existingUser = await prisma.whatsAppUser.findUnique({
                    where: { phoneNumber },
                });
                if (existingUser && existingUser.userId !== user.id) {
                    reply.code(409).send({
                        success: false,
                        error: 'Phone number already linked to another account',
                    });
                    return;
                }
                const whatsappUser = await prisma.whatsAppUser.upsert({
                    where: { phoneNumber },
                    update: {
                        tenantId: user.tenantId,
                        userId: user.id,
                        isVerified: false,
                    },
                    create: {
                        tenantId: user.tenantId,
                        userId: user.id,
                        phoneNumber,
                        whatsappNumber: phoneNumber,
                        isVerified: false,
                    },
                });
                await prisma.user.update({
                    where: { id: user.id },
                    data: { phone: phoneNumber },
                });
                const verificationResult = await webhookHandler.sendVerificationCode(phoneNumber);
                reply.send({
                    success: verificationResult.success,
                    message: verificationResult.success
                        ? 'Verification code sent to your WhatsApp'
                        : 'Failed to send verification code',
                });
            }
            catch (error) {
                console.error('Link phone error:', error);
                reply.code(500).send({
                    success: false,
                    error: 'Failed to link phone number',
                });
            }
        },
    });
    fastify.post('/send-verification', {
        preHandler: [auth_middleware_1.authenticateToken],
        schema: {
            body: VerificationCodeSchema,
        },
        handler: async (request, reply) => {
            try {
                const { phoneNumber } = request.body;
                const user = request.user;
                const whatsappUser = await prisma.whatsAppUser.findFirst({
                    where: {
                        phoneNumber,
                        tenantId: user.tenantId,
                        userId: user.id,
                    },
                });
                if (!whatsappUser) {
                    reply.code(404).send({
                        success: false,
                        error: 'Phone number not linked to your account',
                    });
                    return;
                }
                const result = await webhookHandler.sendVerificationCode(phoneNumber);
                reply.send({
                    success: result.success,
                    message: result.success
                        ? 'Verification code sent to your WhatsApp'
                        : 'Failed to send verification code',
                });
            }
            catch (error) {
                console.error('Send verification error:', error);
                reply.code(500).send({
                    success: false,
                    error: 'Failed to send verification code',
                });
            }
        },
    });
    fastify.post('/verify', {
        preHandler: [auth_middleware_1.authenticateToken],
        schema: {
            body: VerifyUserSchema,
        },
        handler: async (request, reply) => {
            try {
                const { phoneNumber, code } = request.body;
                const user = request.user;
                const whatsappUser = await prisma.whatsAppUser.findFirst({
                    where: {
                        phoneNumber,
                        tenantId: user.tenantId,
                        userId: user.id,
                    },
                });
                if (!whatsappUser) {
                    reply.code(404).send({
                        success: false,
                        error: 'Phone number not linked to your account',
                    });
                    return;
                }
                const isValid = await webhookHandler.verifyUser(phoneNumber, code);
                reply.send({
                    success: isValid,
                    message: isValid
                        ? 'WhatsApp integration activated successfully!'
                        : 'Invalid or expired verification code',
                });
            }
            catch (error) {
                console.error('Verification error:', error);
                reply.code(500).send({
                    success: false,
                    error: 'Failed to verify code',
                });
            }
        },
    });
    fastify.get('/messages', {
        preHandler: [auth_middleware_1.authenticateToken],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
                    offset: { type: 'integer', minimum: 0, default: 0 },
                    direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] },
                },
            },
        },
        handler: async (request, reply) => {
            try {
                const user = request.user;
                const query = request.query;
                const whatsappUser = await prisma.whatsAppUser.findFirst({
                    where: {
                        tenantId: user.tenantId,
                        userId: user.id,
                    },
                });
                if (!whatsappUser) {
                    reply.send({
                        messages: [],
                        total: 0,
                    });
                    return;
                }
                const where = {
                    tenantId: user.tenantId,
                    whatsappUserId: whatsappUser.id,
                };
                if (query.direction) {
                    where.direction = query.direction;
                }
                const [messages, total] = await Promise.all([
                    prisma.whatsAppMessage.findMany({
                        where,
                        orderBy: { createdAt: 'desc' },
                        take: query.limit || 50,
                        skip: query.offset || 0,
                        select: {
                            id: true,
                            messageSid: true,
                            direction: true,
                            content: true,
                            intent: true,
                            entities: true,
                            processedAt: true,
                            responseSent: true,
                            createdAt: true,
                        },
                    }),
                    prisma.whatsAppMessage.count({ where }),
                ]);
                reply.send({
                    messages,
                    total,
                    hasMore: (query.offset || 0) + messages.length < total,
                });
            }
            catch (error) {
                console.error('Get messages error:', error);
                reply.code(500).send({
                    error: 'Failed to fetch messages',
                });
            }
        },
    });
    fastify.delete('/unlink', {
        preHandler: [auth_middleware_1.authenticateToken],
        handler: async (request, reply) => {
            try {
                const user = request.user;
                const result = await prisma.whatsAppUser.deleteMany({
                    where: {
                        tenantId: user.tenantId,
                        userId: user.id,
                    },
                });
                reply.send({
                    success: result.count > 0,
                    message: result.count > 0
                        ? 'WhatsApp integration removed successfully'
                        : 'No WhatsApp integration found',
                });
            }
            catch (error) {
                console.error('Unlink error:', error);
                reply.code(500).send({
                    success: false,
                    error: 'Failed to unlink WhatsApp integration',
                });
            }
        },
    });
    if (process.env.NODE_ENV === 'development') {
        fastify.post('/test', {
            preHandler: [auth_middleware_1.authenticateToken],
            schema: {
                body: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        phoneNumber: { type: 'string' },
                    },
                    required: ['message'],
                },
            },
            handler: async (request, reply) => {
                try {
                    const { message, phoneNumber } = request.body;
                    const user = request.user;
                    let targetPhone = phoneNumber;
                    if (!targetPhone) {
                        const whatsappUser = await prisma.whatsAppUser.findFirst({
                            where: {
                                tenantId: user.tenantId,
                                userId: user.id,
                                isVerified: true,
                            },
                        });
                        if (!whatsappUser) {
                            reply.code(400).send({
                                success: false,
                                error: 'No verified WhatsApp integration found',
                            });
                            return;
                        }
                        targetPhone = whatsappUser.phoneNumber;
                    }
                    const mockWebhookBody = {
                        MessageSid: `test_${Date.now()}`,
                        From: `whatsapp:${targetPhone}`,
                        To: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                        Body: message,
                        AccountSid: process.env.TWILIO_ACCOUNT_SID || 'test',
                    };
                    await webhookHandler.processWebhook(mockWebhookBody);
                    reply.send({
                        success: true,
                        message: 'Test message processed',
                    });
                }
                catch (error) {
                    console.error('Test error:', error);
                    reply.code(500).send({
                        success: false,
                        error: 'Test failed',
                    });
                }
            },
        });
    }
}
//# sourceMappingURL=whatsapp.js.map