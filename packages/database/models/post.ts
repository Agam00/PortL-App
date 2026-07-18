import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { usersTable } from "./user";

export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectPost = typeof postsTable.$inferSelect;
export type InsertPost = typeof postsTable.$inferInsert;
