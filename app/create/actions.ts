'use server'

import { z } from 'zod'
import { db } from '@/db'
import { sortrs as sortrsTable } from '@/db/schema/sortrs'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

const createSortrSchema = z.object({
  title: z.string(),
})

type CreateSortrSchema = z.infer<typeof createSortrSchema>

export async function createSortr({ title }: CreateSortrSchema) {
  const session = await auth()
  console.log('here')

  if (!session) {
    return { message: 'not authenticated' }
  }
  if (title.length < 3) {
    return { message: 'title is too short' }
  }
  await db.insert(sortrsTable).values({
    title,
    userId: session.user.id,
  })

  revalidatePath('/me')
}
