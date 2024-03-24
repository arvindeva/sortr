import { db } from '@/db'

import { sorters as sortersTable } from '@/db/schema/sorters'
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
            return <div key={sorter.id}>{sorter.title}</div>
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
