import { db } from '@/db'

import { sorters as sortersTable } from '@/db/schema/sorters'
import Link from 'next/link'
export default async function Home() {
  const result = await db
    .select({
      id: sortersTable.id,
      title: sortersTable.title,
    })
    .from(sortersTable)

  return (
    <main className="max-w-screen-xl my-8 mx-auto">
      <h1 className="text-2xl font-semibold">Sortr.io</h1>
      <h2 className="text-lg font-semibold">All sorters</h2>
      {result.length > 0 ? (
        <div>
          {result.map((sorter) => {
            return (
              <div key={sorter.id}>
                <Link href={`/sorter/${sorter.id}`}>{sorter.title}</Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div>
          <p>Empty</p>
        </div>
      )}
    </main>
  )
}
