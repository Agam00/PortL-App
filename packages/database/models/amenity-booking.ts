import { pgTable, pgEnum, uuid, date, time, timestamp } from "drizzle-orm/pg-core";
import { amenitiesTable } from "./amenity";
import { flatsTable } from "./flat";
import { usersTable } from "./user";

export const amenityBookingStatusEnum = pgEnum("amenity_booking_status", [
  "confirmed",
  "cancelled",
]);

export const amenityBookingsTable = pgTable("amenity_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),

  amenityId: uuid("amenity_id")
    .notNull()
    .references(() => amenitiesTable.id),
  flatId: uuid("flat_id")
    .notNull()
    .references(() => flatsTable.id),
  bookedByUserId: uuid("booked_by_user_id")
    .notNull()
    .references(() => usersTable.id),

  date: date("date").notNull(),
  slotStart: time("slot_start").notNull(),
  slotEnd: time("slot_end").notNull(),

  status: amenityBookingStatusEnum("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectAmenityBooking = typeof amenityBookingsTable.$inferSelect;
export type InsertAmenityBooking = typeof amenityBookingsTable.$inferInsert;
