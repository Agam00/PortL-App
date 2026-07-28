import { TRPCError } from "@trpc/server";
import { db, eq, and, or, inArray } from "@repo/database";
import { userBlocksTable, contentReportsTable, usersTable } from "@repo/database/schema";
import type { BlockedUser } from "./model";

class ModerationService {
  /** Record a report of objectionable content or a user (App Store Guideline 1.2). */
  async report(
    reporterId: string,
    societyId: string | null,
    input: { targetType: string; targetId: string; reason?: string },
  ): Promise<void> {
    await db.insert(contentReportsTable).values({
      reporterId,
      societyId: societyId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
    });
  }

  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You can't block yourself" });
    }
    const [existing] = await db
      .select({ id: userBlocksTable.id })
      .from(userBlocksTable)
      .where(and(eq(userBlocksTable.blockerId, blockerId), eq(userBlocksTable.blockedId, blockedId)))
      .limit(1);
    if (!existing) await db.insert(userBlocksTable).values({ blockerId, blockedId });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await db
      .delete(userBlocksTable)
      .where(and(eq(userBlocksTable.blockerId, blockerId), eq(userBlocksTable.blockedId, blockedId)));
  }

  /** Users the caller has blocked — their content is hidden from the caller. */
  async blockedByMe(userId: string): Promise<string[]> {
    const rows = await db
      .select({ id: userBlocksTable.blockedId })
      .from(userBlocksTable)
      .where(eq(userBlocksTable.blockerId, userId));
    return rows.map((r) => r.id);
  }

  /** Everyone hidden from `userId` in either direction (I blocked them, or they blocked me). */
  async hiddenFor(userId: string): Promise<string[]> {
    const rows = await db
      .select({ blockerId: userBlocksTable.blockerId, blockedId: userBlocksTable.blockedId })
      .from(userBlocksTable)
      .where(or(eq(userBlocksTable.blockerId, userId), eq(userBlocksTable.blockedId, userId)));
    const set = new Set<string>();
    for (const r of rows) set.add(r.blockerId === userId ? r.blockedId : r.blockerId);
    return Array.from(set);
  }

  async isBlockedBetween(a: string, b: string): Promise<boolean> {
    const [row] = await db
      .select({ id: userBlocksTable.id })
      .from(userBlocksTable)
      .where(
        or(
          and(eq(userBlocksTable.blockerId, a), eq(userBlocksTable.blockedId, b)),
          and(eq(userBlocksTable.blockerId, b), eq(userBlocksTable.blockedId, a)),
        ),
      )
      .limit(1);
    return !!row;
  }

  async listBlocked(userId: string): Promise<BlockedUser[]> {
    const ids = await this.blockedByMe(userId);
    if (ids.length === 0) return [];
    const users = await db
      .select({ id: usersTable.id, fullName: usersTable.fullName })
      .from(usersTable)
      .where(inArray(usersTable.id, ids));
    return users.map((u) => ({ id: u.id, fullName: u.fullName }));
  }
}

export default ModerationService;
