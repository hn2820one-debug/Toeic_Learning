import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../../generated/prisma";

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaLibSql({ url: databaseUrl });
  return new PrismaClient({ adapter } as never);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
