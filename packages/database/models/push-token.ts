import { pgTable, uuid, text, unique, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const pushTokensTable = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    expoPushToken: text("expo_push_token").notNull(),
    deviceInfo: text("device_info"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique().on(table.userId, table.expoPushToken)],
);

export type SelectPushToken = typeof pushTokensTable.$inferSelect;
export type InsertPushToken = typeof pushTokensTable.$inferInsert;
