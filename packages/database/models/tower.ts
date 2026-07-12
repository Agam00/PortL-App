import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";

export const towersTable = pgTable("towers", {
  id: uuid("id").primaryKey().defaultRandom(),

  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),

  name: varchar("name", { length: 40 }).notNull(),
  code: varchar("code", { length: 10 }),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectTower = typeof towersTable.$inferSelect;
export type InsertTower = typeof towersTable.$inferInsert;
