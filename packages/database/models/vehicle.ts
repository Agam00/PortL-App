import { pgTable, pgEnum, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { societiesTable } from "./society";

export const vehicleTypeEnum = pgEnum("vehicle_type", ["car", "bike", "other"]);

// A vehicle a resident owns — shown in their profile and useful for gate/parking records.
export const vehiclesTable = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  societyId: uuid("society_id").references(() => societiesTable.id),

  type: vehicleTypeEnum("type").notNull(),
  number: varchar("number", { length: 20 }).notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectVehicle = typeof vehiclesTable.$inferSelect;
export type InsertVehicle = typeof vehiclesTable.$inferInsert;
