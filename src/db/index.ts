import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

// Ensure dotenv is loaded in non-Next.js environments
if (!process.env.DATABASE_URL && typeof window === "undefined") {
  try {
    require("dotenv").config();
  } catch (e) {
    // dotenv not available, that's okay
  }
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

export const db = drizzle(client, { schema });
