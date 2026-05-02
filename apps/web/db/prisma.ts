import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrisma(): PrismaClient | undefined {
  if (!env.DATABASE_URL) {
    return undefined;
  }

  globalForPrisma.prisma ??= new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

  return globalForPrisma.prisma;
}
