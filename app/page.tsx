import { db } from '@/db'

import { sorters as sortersTable } from '@/db/schema/sorters'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Create a Sorter for Anything
        </h1>
        <p className="text-muted-foreground">
          A sorter is a ranking system that allows you to rank anything from the
          best to worst. Using a sorter allows you to know your preference order
          from a list and it&apos;s quick and easy to create a sorter.
        </p>
      </section>
      <section>
        <h2 className="text-3xl font-semibold mb-4">All sorters</h2>
        {result.length > 0 ? (
          <div className="grid  sm:grid-cols-2  lg:grid-cols-3 gap-4">
            {result.map((sorter) => {
              return (
                <Link href={`/sorter/${sorter.id}`} key={sorter.id}>
                  <Card
                    key={sorter.id}
                    className="min-h-48 hover:border-red-600 transition duration-100 ease-in"
                  >
                    <CardHeader>
                      <CardTitle>{sorter.title}</CardTitle>
                      <CardDescription>
                        Sorter description goes here
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
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
