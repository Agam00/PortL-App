import { pgTable, pgEnum, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { usersTable } from "./user";
import { towersTable } from "./tower";
import { flatsTable } from "./flat";

export const noticeTargetScopeEnum = pgEnum("notice_target_scope", ["all", "tower", "flat"]);

export const noticesTable = pgTable("notices", {
  id: uuid("id").primaryKey().defaultRandom(),

  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),
  authorId: uuid("author_id")
    .notNull()
    .references(() => usersTable.id),

  title: varchar("title", { length: 150 }).notNull(),
  body: text("body").notNull(),

  targetScope: noticeTargetScopeEnum("target_scope").notNull().default("all"),
  targetTowerId: uuid("target_tower_id").references(() => towersTable.id),
  targetFlatId: uuid("target_flat_id").references(() => flatsTable.id),

  publishedAt: timestamp("published_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export type SelectNotice = typeof noticesTable.$inferSelect;
export type InsertNotice = typeof noticesTable.$inferInsert;
