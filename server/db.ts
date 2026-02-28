import { config } from "dotenv";
import { join } from "path";

// In production the bundle lives in dist/, so resolve from repo root.
config({ path: join(process.cwd(), "server", ".env") });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const useSsl =
  process.env.PGSSLMODE === "require" ||
  process.env.DATABASE_URL.includes("sslmode=require") ||
  process.env.RENDER === "true";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });
