import { pgTable, uuid, timestamp, text, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

// A user report of objectionable content or another user (App Store Guideline 1.2).
// targetType is one of: "post" | "comment" | "message" | "user".
export const contentReportsTable = pgTable("content_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id"),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  targetType: varchar("target_type", { length: 16 }).notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectContentReport = typeof contentReportsTable.$inferSelect;
export type InsertContentReport = typeof contentReportsTable.$inferInsert;
