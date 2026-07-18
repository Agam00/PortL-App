import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { postsTable } from "./post";
import { usersTable } from "./user";

export const postLikesTable = pgTable(
  "post_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({ uniqUserPost: unique().on(t.postId, t.userId) }),
);

export type SelectPostLike = typeof postLikesTable.$inferSelect;
export type InsertPostLike = typeof postLikesTable.$inferInsert;
