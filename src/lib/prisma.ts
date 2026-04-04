import path from "path";
import { PrismaClient } from "@prisma/client";

const isSqlServer = (process.env.DATABASE_URL ?? "").startsWith("sqlserver://");

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:dev.db";
  // Convert relative file: URLs to absolute paths for libsql
  if (raw.startsWith("file:./") || raw === "file:dev.db" || raw.startsWith("file:prisma/")) {
    const filename = raw.replace("file:", "").replace("./", "");
    return `file:${path.resolve(process.cwd(), filename)}`;
  }
  return raw;
}

function createPrismaClient() {
  if (isSqlServer) {
    // Production: Azure SQL Server — native Prisma driver, no adapter needed
    return new PrismaClient();
  }
  // Local dev: SQLite via libsql adapter
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSql } = require("@prisma/adapter-libsql");
  const adapter = new PrismaLibSql({ url: resolveDbUrl() });
  return new PrismaClient({ adapter });
}

// Singleton for dev hot reload
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
