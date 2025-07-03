import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    image: text("image"),
    emailVerified: timestamp("emailVerified"),
});

export const verificationToken = pgTable("verificationToken", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().primaryKey(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});
