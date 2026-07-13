import { db, eq, and, isNull, sql } from "@repo/database";
import { notificationsTable, usersTable, flatsTable, complaintsTable } from "@repo/database/schema";
import type { NotificationOutput } from "./model";

function serialize(row: typeof notificationsTable.$inferSelect): NotificationOutput {
  return {
    ...row,
    data: (row.data as Record<string, unknown> | null) ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

class NotificationService {
  async notify(userIds: string[], input: { type: string; title: string; body?: string; data?: Record<string, unknown> }) {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) return;

    await db.insert(notificationsTable).values(
      uniqueIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
      })),
    );
  }

  async listForUser(userId: string): Promise<NotificationOutput[]> {
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(notificationsTable.createdAt)
      .limit(50);
    return rows.reverse().map(serialize);
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, userId)));
  }

  /** Returns a set of noticeIds that are unread (or never notified) for this resident. */
  async getUnreadNoticeIds(userId: string, noticeIds: string[]): Promise<Set<string>> {
    if (noticeIds.length === 0) return new Set();

    const rows = await db
      .select({ data: notificationsTable.data, readAt: notificationsTable.readAt })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.type, "notice")));

    const readNoticeIds = new Set<string>();
    const notifiedNoticeIds = new Set<string>();
    for (const row of rows) {
      const noticeId = (row.data as { noticeId?: string } | null)?.noticeId;
      if (!noticeId) continue;
      notifiedNoticeIds.add(noticeId);
      if (row.readAt) readNoticeIds.add(noticeId);
    }

    return new Set(noticeIds.filter((id) => notifiedNoticeIds.has(id) && !readNoticeIds.has(id)));
  }

  async markNoticeRead(userId: string, noticeId: string): Promise<void> {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.type, "notice"),
          sql`${notificationsTable.data}->>'noticeId' = ${noticeId}`,
          isNull(notificationsTable.readAt),
        ),
      );
  }

  async notifyNoticePublished(
    societyId: string,
    notice: { id: string; title: string; body: string; targetScope: "all" | "tower" | "flat"; targetTowerId: string | null; targetFlatId: string | null },
  ) {
    let residentIds: string[] = [];

    if (notice.targetScope === "all") {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "resident")));
      residentIds = rows.map((r) => r.id);
    } else if (notice.targetScope === "tower" && notice.targetTowerId) {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .innerJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
        .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "resident"), eq(flatsTable.towerId, notice.targetTowerId)));
      residentIds = rows.map((r) => r.id);
    } else if (notice.targetScope === "flat" && notice.targetFlatId) {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "resident"), eq(usersTable.flatId, notice.targetFlatId)));
      residentIds = rows.map((r) => r.id);
    }

    await this.notify(residentIds, {
      type: "notice",
      title: notice.title,
      body: notice.body.slice(0, 140),
      data: { noticeId: notice.id },
    });
  }

  async notifyPollOpened(societyId: string, poll: { id: string; question: string }) {
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "resident")));

    await this.notify(rows.map((r) => r.id), {
      type: "poll",
      title: "New community poll",
      body: poll.question,
      data: { pollId: poll.id },
    });
  }

  async notifyComplaintStatusChanged(complaintId: string) {
    const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, complaintId)).limit(1);
    if (!complaint) return;

    await this.notify([complaint.raisedByUserId], {
      type: "complaint_status",
      title: `Complaint update: ${complaint.title}`,
      body: `Status changed to ${complaint.status.replace("_", " ")}`,
      data: { complaintId },
    });
  }

  async notifyComplaintComment(complaintId: string, authorId: string) {
    const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, complaintId)).limit(1);
    if (!complaint) return;

    const recipients = [complaint.raisedByUserId, complaint.assignedToUserId].filter(
      (id): id is string => !!id && id !== authorId,
    );

    await this.notify(recipients, {
      type: "complaint_comment",
      title: `New reply on: ${complaint.title}`,
      data: { complaintId },
    });
  }
}

export default NotificationService;
