import { auth } from '@/auth'
import { redirect } from 'next/navigation'

import CreateSortrForm from './create-sortr-form'

export default async function CreatePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/create')
  }

  return (
    <main className="space-y-8 max-w-screen-xl mx-auto my-8">
      <h1 className="text-4xl font-semibold">Create new sortr</h1>
      <CreateSortrForm />
    </main>
  )
}
