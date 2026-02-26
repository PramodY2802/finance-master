import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// determine __dirname for this module (ESM)
const __dirname = dirname(fileURLToPath(import.meta.url));

// load environment variables from server/.env before anything else
config({ path: join(__dirname, ".env") });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
