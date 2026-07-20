import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { flatsTable } from "./flat";

export const userRoleEnum = pgEnum("user_role", ["resident", "guard", "admin"]);

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  fullName: varchar("full_name", { length: 80 }).notNull(),

  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  phone: varchar("phone", { length: 20 }).notNull().unique(),

  passwordHash: text("password_hash").notNull(),
  mustResetPassword: boolean("must_reset_password").notNull().default(false),

  // Set when an admin creates the account; the user redeems it (typed or scanned
  // from the QR) to pick their own password. Cleared once the account is claimed.
  inviteCode: varchar("invite_code", { length: 12 }).unique(),

  role: userRoleEnum("role").notNull(),
  societyId: uuid("society_id").references(() => societiesTable.id),
  flatId: uuid("flat_id").references(() => flatsTable.id),

  isActive: boolean("is_active").notNull().default(true),
  profileImageUrl: text("profile_image_url"),

  // Soft delete: the row stays so authored posts, complaints and gate logs keep
  // their attribution, but credentials are wiped and email/phone are released.
  deletedAt: timestamp("deleted_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
