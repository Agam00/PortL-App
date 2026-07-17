import { TRPCError } from "@trpc/server";
import { db, eq, and, or, isNull, gte, desc, inArray, sql } from "@repo/database";
import {
  noticesTable,
  towersTable,
  flatsTable,
  usersTable,
  noticeReactionsTable,
  noticeCommentsTable,
} from "@repo/database/schema";
import type { NoticeOutput, NoticeCommentOutput } from "./model";

async function enrich(notice: typeof noticesTable.$inferSelect): Promise<NoticeOutput> {
  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, notice.authorId)).limit(1);
  const tower = notice.targetTowerId
    ? (await db.select().from(towersTable).where(eq(towersTable.id, notice.targetTowerId)).limit(1))[0]
    : undefined;
  const flat = notice.targetFlatId
    ? (await db.select().from(flatsTable).where(eq(flatsTable.id, notice.targetFlatId)).limit(1))[0]
    : undefined;

  return {
    id: notice.id,
    title: notice.title,
    body: notice.body,
    targetScope: notice.targetScope,
    targetTowerId: notice.targetTowerId,
    targetTowerName: tower?.name ?? null,
    targetFlatId: notice.targetFlatId,
    targetFlatNumber: flat?.flatNumber ?? null,
    authorName: author?.fullName ?? "Society Admin",
    publishedAt: notice.publishedAt?.toISOString() ?? null,
    expiresAt: notice.expiresAt?.toISOString() ?? null,
    isRead: false,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    myReaction: null,
  };
}

class NoticeService {
  async create(
    societyId: string,
    authorId: string,
    input: {
      title: string;
      body: string;
      targetScope: "all" | "tower" | "flat";
      targetTowerId?: string;
      targetFlatId?: string;
      expiresAt?: string;
    },
  ): Promise<NoticeOutput> {
    if (input.targetScope === "tower" && !input.targetTowerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "targetTowerId is required for tower-scoped notices" });
    }
    if (input.targetScope === "flat" && !input.targetFlatId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "targetFlatId is required for flat-scoped notices" });
    }

    if (input.targetTowerId) {
      const [tower] = await db.select().from(towersTable).where(eq(towersTable.id, input.targetTowerId)).limit(1);
      if (!tower || tower.societyId !== societyId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tower not found" });
      }
    }
    if (input.targetFlatId) {
      const [flat] = await db
        .select({ flat: flatsTable, tower: towersTable })
        .from(flatsTable)
        .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
        .where(eq(flatsTable.id, input.targetFlatId))
        .limit(1);
      if (!flat || flat.tower.societyId !== societyId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Flat not found" });
      }
    }

    const [notice] = await db
      .insert(noticesTable)
      .values({
        societyId,
        authorId,
        title: input.title,
        body: input.body,
        targetScope: input.targetScope,
        targetTowerId: input.targetTowerId,
        targetFlatId: input.targetFlatId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      })
      .returning();
    if (!notice) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return enrich(notice);
  }

  async list(societyId: string): Promise<NoticeOutput[]> {
    const rows = await db
      .select()
      .from(noticesTable)
      .where(eq(noticesTable.societyId, societyId))
      .orderBy(noticesTable.publishedAt);

    return Promise.all(rows.reverse().map((row) => enrich(row)));
  }

  private async requireOwned(societyId: string, noticeId: string) {
    const [notice] = await db.select().from(noticesTable).where(eq(noticesTable.id, noticeId)).limit(1);
    if (!notice || notice.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notice not found" });
    }
    return notice;
  }

  async update(
    societyId: string,
    input: { noticeId: string; title?: string; body?: string; expiresAt?: string },
  ): Promise<NoticeOutput> {
    await this.requireOwned(societyId, input.noticeId);

    const [updated] = await db
      .update(noticesTable)
      .set({
        ...(input.title && { title: input.title }),
        ...(input.body && { body: input.body }),
        ...(input.expiresAt !== undefined && { expiresAt: new Date(input.expiresAt) }),
      })
      .where(eq(noticesTable.id, input.noticeId))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return enrich(updated);
  }

  async remove(societyId: string, noticeId: string): Promise<void> {
    await this.requireOwned(societyId, noticeId);
    await db.delete(noticesTable).where(eq(noticesTable.id, noticeId));
  }

  async listForResident(
    societyId: string,
    flatId: string,
    userId: string,
    opts: { limit?: number; offset?: number },
  ): Promise<NoticeOutput[]> {
    const [flat] = await db.select().from(flatsTable).where(eq(flatsTable.id, flatId)).limit(1);
    const towerId = flat?.towerId ?? "";
    const now = new Date();
    const rows = await db
      .select()
      .from(noticesTable)
      .where(
        and(
          eq(noticesTable.societyId, societyId),
          or(isNull(noticesTable.expiresAt), gte(noticesTable.expiresAt, now)),
          or(
            eq(noticesTable.targetScope, "all"),
            and(eq(noticesTable.targetScope, "tower"), eq(noticesTable.targetTowerId, towerId)),
            and(eq(noticesTable.targetScope, "flat"), eq(noticesTable.targetFlatId, flatId)),
          ),
        ),
      )
      .orderBy(desc(noticesTable.publishedAt))
      .limit(opts.limit ?? 20)
      .offset(opts.offset ?? 0);

    const enriched = await Promise.all(rows.map((row) => enrich(row)));
    return this.attachEngagement(enriched, userId);
  }

  /** Batch-overlay like/dislike/comment counts + the caller's own reaction onto a notice list. */
  private async attachEngagement(notices: NoticeOutput[], userId: string): Promise<NoticeOutput[]> {
    const ids = notices.map((n) => n.id);
    if (ids.length === 0) return notices;

    const reactionRows = await db
      .select({
        noticeId: noticeReactionsTable.noticeId,
        reaction: noticeReactionsTable.reaction,
        count: sql<number>`count(*)::int`,
      })
      .from(noticeReactionsTable)
      .where(inArray(noticeReactionsTable.noticeId, ids))
      .groupBy(noticeReactionsTable.noticeId, noticeReactionsTable.reaction);

    const commentRows = await db
      .select({ noticeId: noticeCommentsTable.noticeId, count: sql<number>`count(*)::int` })
      .from(noticeCommentsTable)
      .where(inArray(noticeCommentsTable.noticeId, ids))
      .groupBy(noticeCommentsTable.noticeId);

    const mineRows = await db
      .select({ noticeId: noticeReactionsTable.noticeId, reaction: noticeReactionsTable.reaction })
      .from(noticeReactionsTable)
      .where(and(inArray(noticeReactionsTable.noticeId, ids), eq(noticeReactionsTable.userId, userId)));

    const likeMap = new Map<string, number>();
    const dislikeMap = new Map<string, number>();
    for (const r of reactionRows) {
      if (r.reaction === "like") likeMap.set(r.noticeId, r.count);
      else dislikeMap.set(r.noticeId, r.count);
    }
    const commentMap = new Map(commentRows.map((r) => [r.noticeId, r.count]));
    const mineMap = new Map(mineRows.map((r) => [r.noticeId, r.reaction]));

    return notices.map((n) => ({
      ...n,
      likeCount: likeMap.get(n.id) ?? 0,
      dislikeCount: dislikeMap.get(n.id) ?? 0,
      commentCount: commentMap.get(n.id) ?? 0,
      myReaction: mineMap.get(n.id) ?? null,
    }));
  }

  async react(userId: string, noticeId: string, reaction: "like" | "dislike" | "none"): Promise<void> {
    const [notice] = await db.select().from(noticesTable).where(eq(noticesTable.id, noticeId)).limit(1);
    if (!notice) throw new TRPCError({ code: "NOT_FOUND", message: "Notice not found" });

    if (reaction === "none") {
      await db
        .delete(noticeReactionsTable)
        .where(and(eq(noticeReactionsTable.noticeId, noticeId), eq(noticeReactionsTable.userId, userId)));
      return;
    }

    await db
      .insert(noticeReactionsTable)
      .values({ noticeId, userId, reaction })
      .onConflictDoUpdate({
        target: [noticeReactionsTable.noticeId, noticeReactionsTable.userId],
        set: { reaction },
      });
  }

  async listComments(noticeId: string): Promise<NoticeCommentOutput[]> {
    const rows = await db
      .select({
        id: noticeCommentsTable.id,
        noticeId: noticeCommentsTable.noticeId,
        authorId: noticeCommentsTable.authorId,
        authorName: usersTable.fullName,
        authorRole: usersTable.role,
        body: noticeCommentsTable.body,
        createdAt: noticeCommentsTable.createdAt,
      })
      .from(noticeCommentsTable)
      .innerJoin(usersTable, eq(usersTable.id, noticeCommentsTable.authorId))
      .where(eq(noticeCommentsTable.noticeId, noticeId))
      .orderBy(noticeCommentsTable.createdAt);

    return rows.map((row) => ({ ...row, createdAt: row.createdAt?.toISOString() ?? null }));
  }

  async addComment(noticeId: string, userId: string, body: string): Promise<NoticeCommentOutput> {
    const [notice] = await db.select().from(noticesTable).where(eq(noticesTable.id, noticeId)).limit(1);
    if (!notice) throw new TRPCError({ code: "NOT_FOUND", message: "Notice not found" });

    const [comment] = await db.insert(noticeCommentsTable).values({ noticeId, authorId: userId, body }).returning();
    if (!comment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return {
      id: comment.id,
      noticeId: comment.noticeId,
      authorId: comment.authorId,
      authorName: author?.fullName ?? "",
      authorRole: author?.role ?? "resident",
      body: comment.body,
      createdAt: comment.createdAt?.toISOString() ?? null,
    };
  }
}

export default NoticeService;
