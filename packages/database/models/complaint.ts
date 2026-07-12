import { pgTable, pgEnum, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { usersTable } from "./user";

export const complaintStatusEnum = pgEnum("complaint_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const complaintPriorityEnum = pgEnum("complaint_priority", ["low", "medium", "high"]);

export const complaintsTable = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),

  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),
  raisedByUserId: uuid("raised_by_user_id")
    .notNull()
    .references(() => usersTable.id),

  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),

  status: complaintStatusEnum("status").notNull().default("open"),
  priority: complaintPriorityEnum("priority").notNull().default("medium"),

  assignedToUserId: uuid("assigned_to_user_id").references(() => usersTable.id),

  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type SelectComplaint = typeof complaintsTable.$inferSelect;
export type InsertComplaint = typeof complaintsTable.$inferInsert;
