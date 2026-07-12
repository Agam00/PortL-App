import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const societiesTable = pgTable("societies", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: varchar("name", { length: 120 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 80 }),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectSociety = typeof societiesTable.$inferSelect;
export type InsertSociety = typeof societiesTable.$inferInsert;
