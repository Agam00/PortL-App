import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { pollsTable } from "./poll";
import { pollOptionsTable } from "./poll-option";
import { usersTable } from "./user";

export const pollVotesTable = pgTable(
  "poll_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    pollId: uuid("poll_id")
      .notNull()
      .references(() => pollsTable.id),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptionsTable.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [unique().on(table.pollId, table.optionId, table.userId)],
);

export type SelectPollVote = typeof pollVotesTable.$inferSelect;
export type InsertPollVote = typeof pollVotesTable.$inferInsert;
