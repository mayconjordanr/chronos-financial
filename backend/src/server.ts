import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifySocketIO from 'fastify-socket.io';

import { createPrismaClient } from './config/database';
import { createRedisClient } from './config/redis';
import { AuthService } from './modules/auth/auth.service';

// Import routes
import { authRoutes } from './modules/auth/auth.routes';
import { transactionRoutes } from './modules/transactions/transactions.routes';
import { accountRoutes } from './modules/accounts/accounts.routes';
import { cardRoutes } from './modules/cards/cards.routes';
import { categoryRoutes } from './modules/categories/categories.routes';
import { whatsappRoutes } from './routes/whatsapp';

// Import WebSocket modules
import { setupWebSocketServer } from './websocket/server';
import { RealtimeService } from './services/realtime';

// Import WhatsApp integration
import { initializeWhatsAppIntegration } from './middleware/whatsapp-auth';

const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '0.0.0.0';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      prettyPrint: process.env.NODE_ENV !== 'production'
    }
  });

  try {
    // Initialize database and Redis connections
    const prisma = createPrismaClient();
    const redis = createRedisClient();
    await redis.connect();

    // Initialize services
    const authService = new AuthService(prisma, redis);
    const realtimeService = new RealtimeService();

    // Initialize WhatsApp integration (optional)
    const whatsappStatus = initializeWhatsAppIntegration();

    // Store WhatsApp status for use in routes
    fastify.decorate('whatsappEnabled', whatsappStatus.enabled);

    // Register plugins
    await fastify.register(helmet, {
      contentSecurityPolicy: false
    });

    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    await fastify.register(sensible);

    // Swagger documentation
    await fastify.register(swagger, {
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

    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    // Register Socket.IO
    await fastify.register(fastifySocketIO, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Add services to fastify context
    fastify.decorate('prisma', prisma);
    fastify.decorate('redis', redis);
    fastify.decorate('authService', authService);
    fastify.decorate('realtimeService', realtimeService);

    // Setup WebSocket server after Socket.IO is registered
    await fastify.after(() => {
      setupWebSocketServer(fastify.io, authService, realtimeService);
    });

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        // Check Redis connection
        await redis.ping();

        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0'
        };
      } catch (error) {
        fastify.log.error('Health check failed:', error);
        reply.status(503);
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Register API routes
    await fastify.register(authRoutes, { prefix: '/api/auth' });
    await fastify.register(transactionRoutes, { prefix: '/api/transactions' });
    await fastify.register(accountRoutes, { prefix: '/api/accounts' });
    await fastify.register(cardRoutes, { prefix: '/api/cards' });
    await fastify.register(categoryRoutes, { prefix: '/api/categories' });
    await fastify.register(whatsappRoutes, { prefix: '/api/whatsapp' });

    // Global error handler
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

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      fastify.log.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await fastify.close();
        await prisma.$disconnect();
        await redis.quit();
        fastify.log.info('Server shut down successfully');
        process.exit(0);
      } catch (error) {
        fastify.log.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return fastify;
  } catch (error) {
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
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly
if (require.main === module) {
  start();
}

export { buildServer };