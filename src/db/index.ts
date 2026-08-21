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
  // Connection-acquire budget. 2s was a coin flip against the cold-handshake
  // time to Railway's public proxy (~2-4s from outside), which made any page
  // 500 whenever the pool was cold; it also insta-failed requests queued
  // behind a briefly-full pool during spikes. Queuing beats erroring here.
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
