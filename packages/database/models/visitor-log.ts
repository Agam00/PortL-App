import { pgTable, pgEnum, uuid, timestamp } from "drizzle-orm/pg-core";
import { visitorsTable } from "./visitor";
import { usersTable } from "./user";

export const visitorLogActionEnum = pgEnum("visitor_log_action", ["entry", "exit"]);

export const visitorLogsTable = pgTable("visitor_logs", {
  id: uuid("id").primaryKey().defaultRandom(),

  visitorId: uuid("visitor_id")
    .notNull()
    .references(() => visitorsTable.id),
  guardId: uuid("guard_id")
    .notNull()
    .references(() => usersTable.id),
  action: visitorLogActionEnum("action").notNull(),

  occurredAt: timestamp("occurred_at").defaultNow(),
});

export type SelectVisitorLog = typeof visitorLogsTable.$inferSelect;
export type InsertVisitorLog = typeof visitorLogsTable.$inferInsert;
