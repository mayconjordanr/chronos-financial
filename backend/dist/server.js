"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const sensible_1 = __importDefault(require("@fastify/sensible"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const fastify_socket_io_1 = __importDefault(require("fastify-socket.io"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const auth_service_1 = require("./modules/auth/auth.service");
const auth_routes_1 = require("./modules/auth/auth.routes");
const transactions_routes_1 = require("./modules/transactions/transactions.routes");
const accounts_routes_1 = require("./modules/accounts/accounts.routes");
const cards_routes_1 = require("./modules/cards/cards.routes");
const categories_routes_1 = require("./modules/categories/categories.routes");
const whatsapp_1 = require("./routes/whatsapp");
const server_1 = require("./websocket/server");
const realtime_1 = require("./services/realtime");
const whatsapp_auth_1 = require("./middleware/whatsapp-auth");
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';
async function buildServer() {
    const fastify = (0, fastify_1.default)({
        logger: {
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            prettyPrint: process.env.NODE_ENV !== 'production'
        }
    });
    try {
        const prisma = (0, database_1.createPrismaClient)();
        const redis = (0, redis_1.createRedisClient)();
        await redis.connect();
        const authService = new auth_service_1.AuthService(prisma, redis);
        const realtimeService = new realtime_1.RealtimeService();
        const whatsappStatus = (0, whatsapp_auth_1.initializeWhatsAppIntegration)();
        fastify.decorate('whatsappEnabled', whatsappStatus.enabled);
        await fastify.register(helmet_1.default, {
            contentSecurityPolicy: false
        });
        await fastify.register(cors_1.default, {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        });
        await fastify.register(rate_limit_1.default, {
            max: 100,
            timeWindow: '1 minute'
        });
        await fastify.register(sensible_1.default);
        await fastify.register(swagger_1.default, {
            openapi: {
                info: {
                    title: 'CHRONOS Financial API',
                    description: 'Multi-tenant financial SaaS backend API',
                    version: '1.0.0'
                },
                servers: [
                    {
                        url: process.env.API_BASE_URL || 'http://localhost:3001',
                        description: 'Development server'
                    }
                ]
            }
        });
        await fastify.register(swagger_ui_1.default, {
            routePrefix: '/docs',
            uiConfig: {
                docExpansion: 'full',
                deepLinking: false
            }
        });
        await fastify.register(fastify_socket_io_1.default, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        fastify.decorate('prisma', prisma);
        fastify.decorate('redis', redis);
        fastify.decorate('authService', authService);
        fastify.decorate('realtimeService', realtimeService);
        await fastify.after(() => {
            (0, server_1.setupWebSocketServer)(fastify.io, authService, realtimeService);
        });
        fastify.get('/health', async (request, reply) => {
            try {
                await prisma.$queryRaw `SELECT 1`;
                await redis.ping();
                return {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    version: process.env.npm_package_version || '1.0.0'
                };
            }
            catch (error) {
                fastify.log.error('Health check failed:', error);
                reply.status(503);
                return {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        await fastify.register(auth_routes_1.authRoutes, { prefix: '/api/auth' });
        await fastify.register(transactions_routes_1.transactionRoutes, { prefix: '/api/transactions' });
        await fastify.register(accounts_routes_1.accountRoutes, { prefix: '/api/accounts' });
        await fastify.register(cards_routes_1.cardRoutes, { prefix: '/api/cards' });
        await fastify.register(categories_routes_1.categoryRoutes, { prefix: '/api/categories' });
        await fastify.register(whatsapp_1.whatsappRoutes, { prefix: '/api/whatsapp' });
        fastify.setErrorHandler((error, request, reply) => {
            fastify.log.error(error);
            if (error.validation) {
                reply.status(400).send({
                    success: false,
                    message: 'Validation error',
                    errors: error.validation
                });
                return;
            }
            if (error.statusCode && error.statusCode < 500) {
                reply.status(error.statusCode).send({
                    success: false,
                    message: error.message
                });
                return;
            }
            reply.status(500).send({
                success: false,
                message: process.env.NODE_ENV === 'production'
                    ? 'Internal server error'
                    : error.message
            });
        });
        const gracefulShutdown = async (signal) => {
            fastify.log.info(`Received ${signal}, shutting down gracefully...`);
            try {
                await fastify.close();
                await prisma.$disconnect();
                await redis.quit();
                fastify.log.info('Server shut down successfully');
                process.exit(0);
            }
            catch (error) {
                fastify.log.error('Error during shutdown:', error);
                process.exit(1);
            }
        };
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        return fastify;
    }
    catch (error) {
        fastify.log.error('Error building server:', error);
        throw error;
    }
}
async function start() {
    try {
        const server = await buildServer();
        await server.listen({
            port: PORT,
            host: HOST
        });
        server.log.info(`Server is running on http://${HOST}:${PORT}`);
        server.log.info(`API documentation available at http://${HOST}:${PORT}/docs`);
    }
    catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    start();
}
//# sourceMappingURL=server.js.map