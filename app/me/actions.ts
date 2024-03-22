'use server'

import { z } from 'zod'
import { action } from '@/lib/safe-action'
import { db } from '@/db'
import { sortrs as sortrsTable } from '@/db/schema/sortrs'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export const createSortrSchema = z.object({
  title: z.string(),
})

export type CreateSortrSchema = z.infer<typeof createSortrSchema>
export const createSortr = action(createSortrSchema, _createSortr)

async function _createSortr({ title }: CreateSortrSchema) {
  const session = await auth()

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
