import { pgTable, pgEnum, uuid, varchar, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { flatsTable } from "./flat";

export const dueStatusEnum = pgEnum("due_status", ["pending", "paid", "overdue"]);

export const duesTable = pgTable("dues", {
  id: uuid("id").primaryKey().defaultRandom(),

  flatId: uuid("flat_id")
    .notNull()
    .references(() => flatsTable.id),

  period: varchar("period", { length: 7 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: dueStatusEnum("status").notNull().default("pending"),
  dueDate: date("due_date").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectDue = typeof duesTable.$inferSelect;
export type InsertDue = typeof duesTable.$inferInsert;
