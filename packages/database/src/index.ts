import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Connection string from environment
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://actimeet:actimeet_dev_password@localhost:5432/actimeet_dev";

// Create postgres client
const client = postgres(connectionString);

// Create drizzle database instance with schema
export const db = drizzle(client, { schema });

// Export schema for use in other packages
export * from "./schema/index.js";

// Export types
export type Database = typeof db;
