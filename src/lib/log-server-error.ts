import { db } from "@/db";
import { serverErrors } from "@/db/schema";

// Errors that look like database-connectivity failures never get INSERTed —
// an error logger that writes errors about the database to the database
// during a database outage is a recursion comedy. They still reach the
// platform logs via console.error.
const DB_TROUBLE_RE =
  /ECONN|ETIMEDOUT|ENOTFOUND|connection|password authentication|too many clients|read-only transaction/i;

export interface ServerErrorInput {
  digest: string | null;
  message: string;
  stack: string | null;
  method: string | null;
  path: string | null;
  routeType: string | null;
}

/**
 * Persist one server-side error. Never throws — logging must be strictly
 * weaker than the thing it logs.
 */
export async function logServerError(input: ServerErrorInput): Promise<void> {
  try {
    if (DB_TROUBLE_RE.test(input.message)) {
      console.error(
        `Server error (not persisted, looks like DB trouble): ${input.message}`,
      );
      return;
    }
    await db.insert(serverErrors).values(input);
  } catch (error) {
    console.error("logServerError failed (swallowed):", error);
  }
}
