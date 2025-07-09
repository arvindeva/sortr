import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function generateUniqueUsername(): Promise<string> {
  let username: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    username = uniqueNamesGenerator({
      dictionaries: [adjectives, adjectives, animals],
      separator: '',
      style: 'capital',
      length: 3,
    });

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

  username = uniqueNamesGenerator({
    dictionaries: [adjectives, adjectives, animals],
    separator: '',
    style: 'capital',
    length: 3,
  }) + Math.floor(Math.random() * 1000);

  return username;
}