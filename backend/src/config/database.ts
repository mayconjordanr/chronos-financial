import { PrismaClient } from '@prisma/client';

export const createPrismaClient = () => {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
  });

  return prisma;
};