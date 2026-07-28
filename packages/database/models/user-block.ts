import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

// A user blocking another: the blocker no longer sees the blocked user's posts,
// comments, or messages, and the two can't message each other.
export const userBlocksTable = pgTable(
  "user_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({ uniqBlock: unique().on(t.blockerId, t.blockedId) }),
);

export type SelectUserBlock = typeof userBlocksTable.$inferSelect;
export type InsertUserBlock = typeof userBlocksTable.$inferInsert;
