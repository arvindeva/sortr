import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import SignoutButton from '@/components/ui/sign-out-button'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db, eq } from '@/db'
import { sorters as sortersTable } from '@/db/schema/sorters'

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
    <main className="space-y-8 max-w-screen-xl mx-auto my-8">
      <h1 className="text-4xl font-bold">{session.user.name}</h1>
      <div>
        <h2 className="text-2xl font-semibold">Your sorters</h2>
        {result.length > 0 ? (
          <div>
            {result.map((sorter) => {
              return <div key={sorter.id}>{sorter.title}</div>
            })}
          </div>
        ) : (
          <div>
            <p>You don&apos;t have a sorter yet.</p>
          </div>
        )}
        <Link href="/create">
          <Button>Create a sorter</Button>
        </Link>
      </div>

      <SignoutButton
        signOut={async () => {
          'use server'
          await signOut({ redirectTo: '/' })
        }}
      />
    </main>
  )
}
