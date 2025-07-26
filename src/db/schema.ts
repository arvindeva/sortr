import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  primaryKey,
  varchar,
  jsonb,
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
  coverImageUrl: text("cover_image_url"),
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
  coverImageUrl: text("cover_image_url"),
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
  slug: text("slug"), // For R2 key tracking and URL generation
  imageUrl: text("imageUrl"),
});

export const sortingResults = pgTable("sortingResults", {
  id: uuid("id").defaultRandom().primaryKey(),
  sorterId: uuid("sorterId").references(() => sorters.id, { onDelete: "set null" }), // Rankings survive sorter deletion
  userId: uuid("userId").references(() => user.id, { onDelete: "set null" }), // optional - for anonymous users
  rankings: text("rankings").notNull(), // JSON string of ranked items
  selectedGroups: text("selectedGroups"), // JSON string of selected group IDs (null if no groups used)
  // Sorter-level snapshots for immutable rankings
  sorterTitle: text("sorterTitle"), // Snapshot of sorter title at time of ranking
  sorterCoverImageUrl: text("sorterCoverImageUrl"), // Snapshot of sorter cover image at time of ranking
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Upload sessions for tracking direct R2 uploads
export const uploadSessions = pgTable("uploadSessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  metadata: jsonb("metadata"), // Additional session data
});

// Files uploaded within sessions (before being linked to sorters)
export const sessionFiles = pgTable("sessionFiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("sessionId")
    .notNull()
    .references(() => uploadSessions.id, { onDelete: "cascade" }),
  r2Key: varchar("r2Key", { length: 500 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 20 }).notNull(), // 'cover', 'item', 'group-cover'
  mimeType: varchar("mimeType", { length: 50 }).notNull(),
  fileSize: integer("fileSize").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});
