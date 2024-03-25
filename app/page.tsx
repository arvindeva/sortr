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
    <main className="page-content">
      <section>
        <h1 className="text-4xl font-bold mb-4">
          Create a Sorter for Anything
        </h1>
        <p className="text-muted-foreground">
          A sorter is a ranking system that allows you to rank anything from the
          best to worst. Using a sorter allows you to know your preference order
          from a list and it&apos;s quick and easy to create a sorter.
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold mb-4">All sorters</h2>
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
      </section>
    </main>
  )
}
