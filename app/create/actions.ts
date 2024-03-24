'use server'

import { z } from 'zod'
import { db } from '@/db'
import { sorters as sortersTable } from '@/db/schema/sorters'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const createSorterSchema = z.object({
  title: z.string(),
})

type CreateSorterSchema = z.infer<typeof createSorterSchema>

export async function createSorter({ title }: CreateSorterSchema) {
  const session = await auth()

  if (!session) {
    return { message: 'not authenticated' }
  }

  try {
    await db.insert(sortersTable).values({
      title,
      userId: session.user.id,
    })
  } catch (error) {
    return {
      message: 'Internal server error: failed to create sorter',
    }
  }

  revalidatePath('/me')
  redirect('/me')
}
