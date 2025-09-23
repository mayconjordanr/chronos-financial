"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrismaClient = void 0;
const client_1 = require("@prisma/client");
const createPrismaClient = () => {
    const prisma = new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
    return prisma;
};
exports.createPrismaClient = createPrismaClient;
//# sourceMappingURL=database.js.map