import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  time,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { societiesTable } from "./society";

export const amenitiesTable = pgTable("amenities", {
  id: uuid("id").primaryKey().defaultRandom(),

  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),

  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),

  capacity: integer("capacity").notNull().default(1),
  openTime: time("open_time").notNull().default("06:00"),
  closeTime: time("close_time").notNull().default("22:00"),
  slotMinutes: integer("slot_minutes").notNull().default(60),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectAmenity = typeof amenitiesTable.$inferSelect;
export type InsertAmenity = typeof amenitiesTable.$inferInsert;
