import { PrismaClient } from '../../generated/prisma-client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Create a connection pool
const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });

// Instantiate the adapter
const adapter = new PrismaPg(pool);

// Pass the adapter to PrismaClient
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}