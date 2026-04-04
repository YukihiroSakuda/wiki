import path from "node:path";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: dbUrl,
  },
  migrate: {
    async adapter() {
      const { PrismaLibSql } = await import("@prisma/adapter-libsql");
      const raw = dbUrl;
      let resolvedUrl = raw;
      if (raw.startsWith("file:./") || raw === "file:dev.db") {
        const filename = raw.replace("file:", "").replace("./", "");
        resolvedUrl = `file:${path.resolve(process.cwd(), filename)}`;
      }
      return new PrismaLibSql({ url: resolvedUrl });
    },
  },
});
