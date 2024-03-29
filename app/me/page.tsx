import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db, eq } from '@/db'
import { sorters as sortersTable } from '@/db/schema/sorters'
import SignoutButton from '@/components/ui/sign-out-button'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/me')
  }

  const result = await db
    .select({
      id: sortersTable.id,
      title: sortersTable.title,
    })
    .from(sortersTable)
    .where(eq(sortersTable.userId, session.user.id))

  return (
    <main className="page-content">
      <div className="lg:flex lg:flex-row lg:items-center lg:space-x-4">
        <h1 className="text-4xl font-bold mb-2">{session.user.name}</h1>
        <SignoutButton
          signOut={async () => {
            'use server'
            await signOut({ redirectTo: '/' })
          }}
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Created Sorters</h2>
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
            <p>You don&apos;t have a sorter yet.</p>
          </div>
        )}
      </div>
      <div>
        <Link href="/create">
          <Button>Create a sorter</Button>
        </Link>
      </div>
    </main>
  )
}
