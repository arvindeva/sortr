import { auth } from '@/auth'
import { redirect } from 'next/navigation'

import CreateSortrForm from './create-sortr-form'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/me')
  }

  return (
    <main className="space-y-8 max-w-screen-xl mx-auto">
      <h1 className="text-4xl">Create new sortr</h1>
      <CreateSortrForm user={session.user} />
    </main>
  )
}
