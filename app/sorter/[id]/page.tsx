import { db, eq } from '@/db'
import { auth } from '@/auth'
import { sorters as sortersTable } from '@/db/schema/sorters'
import { notFound } from 'next/navigation'
import DeleteButton from './delete-button'

export default async function SorterPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  const result = await db
    .select({
      id: sortersTable.id,
      title: sortersTable.title,
      userId: sortersTable.userId,
    })
    .from(sortersTable)
    .where(eq(sortersTable.id, parseInt(params.id)))
    .limit(1)

  if (result.length < 1) {
    notFound()
  }
  const sorter = result[0]
  const owner = session?.user.id === sorter.userId

  return (
    <main className="page-content">
      <h1 className="text-4xl font-bold">{sorter.title}</h1>
      {owner && <DeleteButton id={sorter.id} />}
    </main>
  )
}
