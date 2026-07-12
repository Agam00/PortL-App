import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { pollsTable } from "./poll";

export const pollOptionsTable = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),

  pollId: uuid("poll_id")
    .notNull()
    .references(() => pollsTable.id),
  label: varchar("label", { length: 120 }).notNull(),
});

export type SelectPollOption = typeof pollOptionsTable.$inferSelect;
export type InsertPollOption = typeof pollOptionsTable.$inferInsert;
