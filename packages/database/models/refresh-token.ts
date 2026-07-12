import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  tokenHash: text("token_hash").notNull(),
  deviceInfo: text("device_info"),

  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),

  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectRefreshToken = typeof refreshTokensTable.$inferSelect;
export type InsertRefreshToken = typeof refreshTokensTable.$inferInsert;
