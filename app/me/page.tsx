import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import SignoutButton from '@/components/ui/sign-out-button'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db, eq } from '@/db'
import { sortrs as sortrsTable } from '@/db/schema/sortrs'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/me')
  }

  const result = await db
    .select({
      id: sortrsTable.id,
      title: sortrsTable.title,
    })
    .from(sortrsTable)
    .where(eq(sortrsTable.userId, session.user.id))
  console.log(result)

  return (
    <main className="space-y-8 max-w-screen-xl mx-auto">
      <h1 className="text-4xl">{session.user.name}</h1>
      <div>
        <h2 className="text-2xl">Your posts</h2>
        {result.length > 0 ? (
          <div>
            {result.map((sortr) => {
              return <div key={sortr.id}>{sortr.title}</div>
            })}
          </div>
        ) : (
          <div>
            <p>You don&apos;t have a sortr yet.</p>
          </div>
        )}
        <Link href="/create">
          <Button>Create a sortr</Button>
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
