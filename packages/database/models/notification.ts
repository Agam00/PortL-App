import { pgTable, uuid, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),

  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  body: text("body"),
  data: jsonb("data"),

  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectNotification = typeof notificationsTable.$inferSelect;
export type InsertNotification = typeof notificationsTable.$inferInsert;
