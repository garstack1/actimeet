import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://actimeet:actimeet_dev_password@localhost:5432/actimeet_dev",
  },
  verbose: true,
  strict: true,
});
