import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Ensure dotenv is loaded in non-Next.js environments
if (!process.env.DATABASE_URL && typeof window === "undefined") {
  try {
    require("dotenv").config();
  } catch (e) {
    // dotenv not available, that's okay
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if no connection available
});

export const db = drizzle(pool, { schema });
