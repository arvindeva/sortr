import { pgTable, serial, text } from 'drizzle-orm/pg-core'
import { users } from '@/db/schema/users'

export const sorters = pgTable('sorters', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
})
