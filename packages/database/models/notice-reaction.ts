import { pgTable, pgEnum, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { noticesTable } from "./notice";
import { usersTable } from "./user";

export const noticeReactionTypeEnum = pgEnum("notice_reaction_type", ["like", "dislike"]);

// One row per (notice, user); reaction flips between like/dislike or is removed entirely.
export const noticeReactionsTable = pgTable(
  "notice_reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noticeId: uuid("notice_id")
      .notNull()
      .references(() => noticesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    reaction: noticeReactionTypeEnum("reaction").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({ uniqUserNotice: unique().on(t.noticeId, t.userId) }),
);

export type SelectNoticeReaction = typeof noticeReactionsTable.$inferSelect;
export type InsertNoticeReaction = typeof noticeReactionsTable.$inferInsert;
