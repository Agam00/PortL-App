import { TRPCError } from "@trpc/server";
import { db, eq, and, or, isNull, gte, desc } from "@repo/database";
import { noticesTable, towersTable, flatsTable, usersTable } from "@repo/database/schema";
import type { NoticeOutput } from "./model";

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

    return Promise.all(rows.map((row) => enrich(row)));
  }
}

export default NoticeService;
