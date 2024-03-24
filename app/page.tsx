import { db } from '@/db'

import { sortrs as sortrsTable } from '@/db/schema/sortrs'
export default async function Home() {
  const result = await db
    .select({
      id: sortrsTable.id,
      title: sortrsTable.title,
    })
    .from(sortrsTable)

  return (
    <main className="max-w-screen-xl my-8 mx-auto">
      <h1 className="text-2xl font-semibold">Sortr</h1>
      <h2 className="text-lg font-semibold">All sorters</h2>
      {result.length > 0 ? (
        <div>
          {result.map((sortr) => {
            return <div key={sortr.id}>{sortr.title}</div>
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
