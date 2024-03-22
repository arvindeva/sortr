import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/me')
  }

  return <h1 className="text-4xl">{session.user.id}</h1>
}
