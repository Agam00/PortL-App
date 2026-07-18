import { pgTable, pgEnum, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { flatsTable } from "./flat";
import { usersTable } from "./user";

export const visitorTypeEnum = pgEnum("visitor_type", [
  "guest",
  "delivery",
  "cab",
  "service",
  "other",
]);

export const visitorSourceEnum = pgEnum("visitor_source", [
  "guard_initiated",
  "resident_preapproved",
]);

export const visitorStatusEnum = pgEnum("visitor_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
  "checked_in",
  "checked_out",
  "cancelled",
]);

export const visitorsTable = pgTable("visitors", {
  id: uuid("id").primaryKey().defaultRandom(),

  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),
  flatId: uuid("flat_id")
    .notNull()
    .references(() => flatsTable.id),

  name: varchar("name", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  photoUrl: text("photo_url"),

  type: visitorTypeEnum("type").notNull(),
  source: visitorSourceEnum("source").notNull(),
  status: visitorStatusEnum("status").notNull().default("pending"),

  requestedByGuardId: uuid("requested_by_guard_id").references(() => usersTable.id),
  decidedByUserId: uuid("decided_by_user_id").references(() => usersTable.id),

  // 6-digit gate-pass code for resident pre-approvals — the resident shares it, a guard
  // types it into the gate keypad to look the visitor up and check them in. Unique per society.
  passCode: varchar("pass_code", { length: 6 }),

  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),

  createdAt: timestamp("created_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
});

export type SelectVisitor = typeof visitorsTable.$inferSelect;
export type InsertVisitor = typeof visitorsTable.$inferInsert;
