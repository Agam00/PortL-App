import { pgTable, pgEnum, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { usersTable } from "./user";

export const serviceRequestStatusEnum = pgEnum("service_request_status", [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
]);

export const serviceRequestsTable = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),
  residentId: uuid("resident_id")
    .notNull()
    .references(() => usersTable.id),
  category: varchar("category", { length: 60 }).notNull(),
  note: text("note"),
  scheduledAt: timestamp("scheduled_at"),
  status: serviceRequestStatusEnum("status").notNull().default("requested"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectServiceRequest = typeof serviceRequestsTable.$inferSelect;
export type InsertServiceRequest = typeof serviceRequestsTable.$inferInsert;
