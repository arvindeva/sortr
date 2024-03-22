import { auth, signOut } from '@/auth'
import SignoutButton from '@/components/ui/sign-out-button'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/me')
  }

  return (
    <div>
      <h1 className="text-4xl">{session.user.id}</h1>
      <SignoutButton
        signOut={async () => {
          'use server'
          await signOut({ redirectTo: '/' })
        }}
      />
    </div>
  )
}
