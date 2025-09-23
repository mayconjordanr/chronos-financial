import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
export default function cardRoutes(fastify: FastifyInstance, options: FastifyPluginOptions & {
    prisma: PrismaClient;
}): Promise<void>;
//# sourceMappingURL=cards.routes.d.ts.map