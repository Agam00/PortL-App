import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { usersTable } from "./user";

export const pollsTable = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),

  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => usersTable.id),

  question: varchar("question", { length: 200 }).notNull(),
  description: text("description"),
  multiSelect: boolean("multi_select").notNull().default(false),

  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectPoll = typeof pollsTable.$inferSelect;
export type InsertPoll = typeof pollsTable.$inferInsert;
