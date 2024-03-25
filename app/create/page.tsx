import { auth } from '@/auth'
import { redirect } from 'next/navigation'

import CreateSorterForm from './create-sorter-form'

export default async function CreatePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/create')
  }

  return (
    <main className="page-content">
      <h1 className="text-4xl font-bold">Create new sorter</h1>
      <CreateSorterForm />
    </main>
  )
}
