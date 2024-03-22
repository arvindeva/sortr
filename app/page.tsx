import { db } from '@/db'
import { users as usersTable } from '@/db/schema/users'

export default async function Home() {
  const users = await db.select().from(usersTable)

  console.log(users)
  return (
    <main>
      <h1>Sortr</h1>
    </main>
  )
}
