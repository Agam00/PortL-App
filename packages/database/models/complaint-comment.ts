import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { complaintsTable } from "./complaint";
import { usersTable } from "./user";

export const complaintCommentsTable = pgTable("complaint_comments", {
  id: uuid("id").primaryKey().defaultRandom(),

  complaintId: uuid("complaint_id")
    .notNull()
    .references(() => complaintsTable.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),
  body: text("body").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectComplaintComment = typeof complaintCommentsTable.$inferSelect;
export type InsertComplaintComment = typeof complaintCommentsTable.$inferInsert;
