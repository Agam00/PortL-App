import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { noticesTable } from "./notice";
import { usersTable } from "./user";

export const noticeCommentsTable = pgTable("notice_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  noticeId: uuid("notice_id")
    .notNull()
    .references(() => noticesTable.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectNoticeComment = typeof noticeCommentsTable.$inferSelect;
export type InsertNoticeComment = typeof noticeCommentsTable.$inferInsert;
