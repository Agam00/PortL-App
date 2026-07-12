import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { towersTable } from "./tower";

export const flatsTable = pgTable("flats", {
  id: uuid("id").primaryKey().defaultRandom(),

  towerId: uuid("tower_id")
    .notNull()
    .references(() => towersTable.id),

  flatNumber: varchar("flat_number", { length: 20 }).notNull(),
  floor: integer("floor"),
  type: varchar("type", { length: 20 }),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectFlat = typeof flatsTable.$inferSelect;
export type InsertFlat = typeof flatsTable.$inferInsert;
