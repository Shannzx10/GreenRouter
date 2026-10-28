import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Singleton — hindari koneksi berlebih saat hot-reload di dev.
const globalForPrisma = globalThis as unknown as { __grPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.__grPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.__grPrisma = prisma;
