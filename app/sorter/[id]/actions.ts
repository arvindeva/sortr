'use server'

import { db, eq } from '@/db'

import { sorters as sortersTable } from '@/db/schema/sorters'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteSorter(id: number) {
  try {
    await db.delete(sortersTable).where(eq(sortersTable.id, id))
  } catch (error) {
    return {
      message: 'Internal server error: failed to create sorter',
    }
  }

  revalidatePath('/me')
  revalidatePath('/')
  redirect('/me')
}
