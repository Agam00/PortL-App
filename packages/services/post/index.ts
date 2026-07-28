import { TRPCError } from "@trpc/server";
import { db, eq, and, inArray, desc, sql } from "@repo/database";
import { postsTable, postLikesTable, postCommentsTable, usersTable, flatsTable, userBlocksTable } from "@repo/database/schema";
import type { PostOutput, PostCommentOutput } from "./model";

type Role = "resident" | "guard" | "admin";

class PostService {
  /** Users the caller has blocked — their posts/comments are hidden from the caller. */
  private async blockedByMe(userId: string): Promise<Set<string>> {
    const rows = await db
      .select({ id: userBlocksTable.blockedId })
      .from(userBlocksTable)
      .where(eq(userBlocksTable.blockerId, userId));
    return new Set(rows.map((r) => r.id));
  }

  async list(societyId: string, userId: string): Promise<PostOutput[]> {
    const allRows = await db
      .select({
        id: postsTable.id,
        authorId: postsTable.authorId,
        authorName: usersTable.fullName,
        authorRole: usersTable.role,
        flatNumber: flatsTable.flatNumber,
        body: postsTable.body,
        imageUrl: postsTable.imageUrl,
        pinnedAt: postsTable.pinnedAt,
        createdAt: postsTable.createdAt,
      })
      .from(postsTable)
      .innerJoin(usersTable, eq(usersTable.id, postsTable.authorId))
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .where(eq(postsTable.societyId, societyId))
      // Pinned posts float to the top (NULLS LAST so unpinned don't sort first), otherwise newest first.
      .orderBy(sql`${postsTable.pinnedAt} desc nulls last`, desc(postsTable.createdAt))
      .limit(50);

    const blocked = await this.blockedByMe(userId);
    const rows = allRows.filter((r) => !blocked.has(r.authorId));

    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return [];

    const likeRows = await db
      .select({ postId: postLikesTable.postId, count: sql<number>`count(*)::int` })
      .from(postLikesTable)
      .where(inArray(postLikesTable.postId, ids))
      .groupBy(postLikesTable.postId);
    const commentRows = await db
      .select({ postId: postCommentsTable.postId, count: sql<number>`count(*)::int` })
      .from(postCommentsTable)
      .where(inArray(postCommentsTable.postId, ids))
      .groupBy(postCommentsTable.postId);
    const mineRows = await db
      .select({ postId: postLikesTable.postId })
      .from(postLikesTable)
      .where(and(inArray(postLikesTable.postId, ids), eq(postLikesTable.userId, userId)));

    const likeMap = new Map(likeRows.map((r) => [r.postId, r.count]));
    const commentMap = new Map(commentRows.map((r) => [r.postId, r.count]));
    const mine = new Set(mineRows.map((r) => r.postId));

    return rows.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      authorName: r.authorName,
      authorRole: r.authorRole as Role,
      flatNumber: r.flatNumber ?? null,
      body: r.body,
      imageUrl: r.imageUrl ?? null,
      isPinned: !!r.pinnedAt,
      createdAt: r.createdAt?.toISOString() ?? null,
      likeCount: likeMap.get(r.id) ?? 0,
      commentCount: commentMap.get(r.id) ?? 0,
      isLiked: mine.has(r.id),
    }));
  }

  async create(societyId: string, userId: string, input: { body: string; imageBase64?: string }): Promise<PostOutput> {
    const [post] = await db
      .insert(postsTable)
      .values({ societyId, authorId: userId, body: input.body, imageUrl: input.imageBase64 })
      .returning();
    if (!post) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [author] = await db
      .select({ fullName: usersTable.fullName, role: usersTable.role, flatNumber: flatsTable.flatNumber })
      .from(usersTable)
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .where(eq(usersTable.id, userId))
      .limit(1);

    return {
      id: post.id,
      authorId: post.authorId,
      authorName: author?.fullName ?? "",
      authorRole: (author?.role ?? "resident") as Role,
      flatNumber: author?.flatNumber ?? null,
      body: post.body,
      imageUrl: post.imageUrl ?? null,
      isPinned: !!post.pinnedAt,
      createdAt: post.createdAt?.toISOString() ?? null,
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
    };
  }

  /** Toggle the caller's like; returns the new liked state. */
  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean }> {
    const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

    const [existing] = await db
      .select({ id: postLikesTable.id })
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)))
      .limit(1);

    if (existing) {
      await db.delete(postLikesTable).where(eq(postLikesTable.id, existing.id));
      return { liked: false };
    }
    await db.insert(postLikesTable).values({ postId, userId });
    return { liked: true };
  }

  async listComments(postId: string, userId: string): Promise<PostCommentOutput[]> {
    const blocked = await this.blockedByMe(userId);
    const rows = await db
      .select({
        id: postCommentsTable.id,
        postId: postCommentsTable.postId,
        authorId: postCommentsTable.authorId,
        authorName: usersTable.fullName,
        authorRole: usersTable.role,
        flatNumber: flatsTable.flatNumber,
        body: postCommentsTable.body,
        createdAt: postCommentsTable.createdAt,
      })
      .from(postCommentsTable)
      .innerJoin(usersTable, eq(usersTable.id, postCommentsTable.authorId))
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .where(eq(postCommentsTable.postId, postId))
      .orderBy(postCommentsTable.createdAt);

    return rows
      .filter((r) => !blocked.has(r.authorId))
      .map((r) => ({
        ...r,
        authorRole: r.authorRole as Role,
        flatNumber: r.flatNumber ?? null,
        createdAt: r.createdAt?.toISOString() ?? null,
      }));
  }

  async addComment(postId: string, userId: string, body: string): Promise<PostCommentOutput> {
    const [post] = await db.select({ id: postsTable.id }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

    const [comment] = await db.insert(postCommentsTable).values({ postId, authorId: userId, body }).returning();
    if (!comment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [author] = await db
      .select({ fullName: usersTable.fullName, role: usersTable.role, flatNumber: flatsTable.flatNumber })
      .from(usersTable)
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .where(eq(usersTable.id, userId))
      .limit(1);

    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      authorName: author?.fullName ?? "",
      authorRole: (author?.role ?? "resident") as Role,
      flatNumber: author?.flatNumber ?? null,
      body: comment.body,
      createdAt: comment.createdAt?.toISOString() ?? null,
    };
  }

  /** Admin moderation — hard-deletes a post (its likes/comments cascade via FK). */
  async deletePost(societyId: string, postId: string): Promise<void> {
    const [post] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(and(eq(postsTable.id, postId), eq(postsTable.societyId, societyId)))
      .limit(1);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

    await db.delete(postLikesTable).where(eq(postLikesTable.postId, postId));
    await db.delete(postCommentsTable).where(eq(postCommentsTable.postId, postId));
    await db.delete(postsTable).where(eq(postsTable.id, postId));
  }

  /** Admin moderation — removes a single comment (society-scoped via its post). */
  async deleteComment(societyId: string, commentId: string): Promise<void> {
    const [row] = await db
      .select({ id: postCommentsTable.id })
      .from(postCommentsTable)
      .innerJoin(postsTable, eq(postsTable.id, postCommentsTable.postId))
      .where(and(eq(postCommentsTable.id, commentId), eq(postsTable.societyId, societyId)))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });

    await db.delete(postCommentsTable).where(eq(postCommentsTable.id, commentId));
  }

  /** Admin pins/unpins a post to the top of the community feed. */
  async setPinned(societyId: string, postId: string, pinned: boolean): Promise<{ isPinned: boolean }> {
    const [post] = await db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(and(eq(postsTable.id, postId), eq(postsTable.societyId, societyId)))
      .limit(1);
    if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

    await db
      .update(postsTable)
      .set({ pinnedAt: pinned ? new Date() : null })
      .where(eq(postsTable.id, postId));
    return { isPinned: pinned };
  }
}

export default PostService;
