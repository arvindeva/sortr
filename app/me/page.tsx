import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import SignoutButton from '@/components/ui/sign-out-button'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/me')
  }

  return (
    <main className="space-y-8 max-w-screen-xl mx-auto">
      <h1 className="text-4xl">{session.user.name}</h1>
      <div>
        <h2 className="text-2xl">Your posts</h2>
        <p>Looks like you don&apos;t have any sortrs...</p>
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
