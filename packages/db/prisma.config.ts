import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL || "postgresql://placeholder",
  },
  // Use separate config for migrate/direct if needed
  // Note: Prisma 7 handles this via the config object
  migrations: {
    seed: "npx tsx seed-test-data.ts",
  },
});
