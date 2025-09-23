import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
export declare function categoryRoutes(fastify: FastifyInstance, options: FastifyPluginOptions & {
    prisma: PrismaClient;
}): Promise<void>;
export interface CategoryRoutesOptions extends FastifyPluginOptions {
    prisma: PrismaClient;
}
export declare const CATEGORY_ROUTES_CONFIG: {
    prefix: string;
    tags: string[];
    description: string;
};
//# sourceMappingURL=categories.routes.d.ts.map