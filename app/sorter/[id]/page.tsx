import { db, eq } from '@/db'

import { sorters as sortersTable } from '@/db/schema/sorters'
import { notFound } from 'next/navigation'

export default async function SorterPage({
  params,
}: {
  params: { id: string }
}) {
  const result = await db
    .select({
      id: sortersTable.id,
      title: sortersTable.title,
    })
    .from(sortersTable)
    .where(eq(sortersTable.id, parseInt(params.id)))
    .limit(1)

  if (result.length < 1) {
    notFound()
  }
  const sorter = result[0]

  return (
    <main className="page-content">
      <h1 className="text-4xl font-bold">{sorter.title}</h1>
    </main>
  )
}
