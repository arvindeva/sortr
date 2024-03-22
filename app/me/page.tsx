import { auth, signOut } from '@/auth'
import SignoutButton from '@/components/ui/sign-out-button'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/me')
  }

  return (
    <main>
      <h1 className="text-4xl">{session.user.name}</h1>
      <div>
        <h2 className="text-2xl">Your posts</h2>
        <p>Looks like you don&apos;t have any posts...</p>
      </div>
      <h2 className="text-2xl">Create posts</h2>
      <SignoutButton
        signOut={async () => {
          'use server'
          await signOut({ redirectTo: '/' })
        }}
      />
    </main>
  )
}
