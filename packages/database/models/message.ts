import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { societiesTable } from "./society";
import { usersTable } from "./user";

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  societyId: uuid("society_id")
    .notNull()
    .references(() => societiesTable.id),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => usersTable.id),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => usersTable.id),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectMessage = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
