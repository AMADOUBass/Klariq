import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_DIRECT_URL"),
  },
  migrations: {
    seed: "npx tsx seed-test-data.ts",
  },
});
