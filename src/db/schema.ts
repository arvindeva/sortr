import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  username: text("username").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified"),
});

export const account = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const session = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationToken = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().primaryKey(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const sorters = pgTable("sorters", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  slug: text("slug").notNull().unique(),
  useGroups: boolean("use_groups").default(false).notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completionCount: integer("completionCount").default(0).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
});

export const sorterGroups = pgTable("sorterGroups", {
  id: uuid("id").defaultRandom().primaryKey(),
  sorterId: uuid("sorterId")
    .notNull()
    .references(() => sorters.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sorterItems = pgTable("sorterItems", {
  id: uuid("id").defaultRandom().primaryKey(),
  sorterId: uuid("sorterId")
    .notNull()
    .references(() => sorters.id, { onDelete: "cascade" }),
  groupId: uuid("groupId").references(() => sorterGroups.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  imageUrl: text("imageUrl"),
});

export const sortingResults = pgTable("sortingResults", {
  id: uuid("id").defaultRandom().primaryKey(),
  sorterId: uuid("sorterId")
    .notNull()
    .references(() => sorters.id, { onDelete: "cascade" }),
  userId: uuid("userId").references(() => user.id, { onDelete: "set null" }), // optional - for anonymous users
  rankings: text("rankings").notNull(), // JSON string of ranked items
  selectedGroups: text("selectedGroups"), // JSON string of selected group IDs (null if no groups used)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
