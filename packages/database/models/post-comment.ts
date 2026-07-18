import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { postsTable } from "./post";
import { usersTable } from "./user";

export const postCommentsTable = pgTable("post_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => postsTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectPostComment = typeof postCommentsTable.$inferSelect;
export type InsertPostComment = typeof postCommentsTable.$inferInsert;
