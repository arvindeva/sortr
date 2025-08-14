import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from "unique-names-generator";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateUniqueUsername(): Promise<string> {
  let username: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    username = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: "",
      style: "capital",
      length: 2,
    });

    // Ensure username is under 20 characters
    if (username.length > 19) {
      continue;
    }

    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.username, username))
      .limit(1);

    if (existingUser.length === 0) {
      return username;
    }

    attempts++;
  } while (attempts < maxAttempts);

  // Fallback with number suffix, ensuring total length stays under 20
  do {
    const baseUsername = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: "",
      style: "capital", 
      length: 2,
    });
    
    const randomNum = Math.floor(Math.random() * 1000);
    username = baseUsername + randomNum;
  } while (username.length > 19);

  return username;
}
