import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { usersTable } from "./user";

export const staffDirectoryTable = pgTable("staff_directory", {
  id: uuid("id").primaryKey().defaultRandom(),

  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),

  name: varchar("name", { length: 80 }).notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  photoUrl: text("photo_url"),

  isVerifiedByAdmin: boolean("is_verified_by_admin").notNull().default(false),
  addedByUserId: uuid("added_by_user_id")
    .notNull()
    .references(() => usersTable.id),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectStaffDirectory = typeof staffDirectoryTable.$inferSelect;
export type InsertStaffDirectory = typeof staffDirectoryTable.$inferInsert;
