import { Expo } from "expo-server-sdk";
import { db, eq, and, inArray, isNull, sql } from "@repo/database";
import { notificationsTable, usersTable, flatsTable, complaintsTable, pushTokensTable } from "@repo/database/schema";
import type { NotificationOutput } from "./model";

const expo = new Expo();

function serialize(row: typeof notificationsTable.$inferSelect): NotificationOutput {
  return {
    ...row,
    data: (row.data as Record<string, unknown> | null) ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

class NotificationService {
  private async sendPush(userIds: string[], input: { title: string; body?: string; data?: Record<string, unknown> }) {
    if (userIds.length === 0) return;

    const tokenRows = await db
      .select({ expoPushToken: pushTokensTable.expoPushToken })
      .from(pushTokensTable)
      .where(inArray(pushTokensTable.userId, userIds));

    const messages = tokenRows
      .filter((row) => Expo.isExpoPushToken(row.expoPushToken))
      .map((row) => ({
        to: row.expoPushToken,
        title: input.title,
        body: input.body,
        data: input.data ?? {},
      }));
    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch {
        // Best-effort delivery — the in-app notification row is already the source of truth.
      }
    }
  }

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

    await this.sendPush(uniqueIds, input);
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

  async markAllRead(userId: string): Promise<void> {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(and(eq(notificationsTable.userId, userId), isNull(notificationsTable.readAt)));
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
        .where(
          and(
            eq(usersTable.societyId, societyId),
            eq(usersTable.role, "resident"),
            isNull(usersTable.deletedAt),
          ),
        );
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
      .where(
        and(
          eq(usersTable.societyId, societyId),
          eq(usersTable.role, "resident"),
          isNull(usersTable.deletedAt),
        ),
      );

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

  async notifyVisitorRequest(flatId: string, visitor: { id: string; name: string }) {
    const rows = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.flatId, flatId), eq(usersTable.role, "resident")));

    await this.notify(rows.map((r) => r.id), {
      type: "visitor_request",
      title: "New visitor request",
      body: `${visitor.name} is waiting at the gate`,
      data: { visitorId: visitor.id },
    });
  }

  async notifyVisitorDecision(guardId: string | null, visitor: { id: string; name: string; status: string }) {
    if (!guardId) return;

    await this.notify([guardId], {
      type: "visitor_decision",
      title: `Visitor ${visitor.status}`,
      body: `${visitor.name} was ${visitor.status} by the resident`,
      data: { visitorId: visitor.id },
    });
  }

  async notifyBookingConfirmed(userId: string, booking: { id: string; amenityName: string; date: string; slotStart: string }) {
    await this.notify([userId], {
      type: "booking_confirmed",
      title: "Booking confirmed",
      body: `${booking.amenityName} on ${booking.date} at ${booking.slotStart.slice(0, 5)}`,
      data: { bookingId: booking.id },
    });
  }

  async notifyNewMessage(recipientId: string, senderId: string, body: string) {
    const [sender] = await db.select({ name: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, senderId)).limit(1);
    await this.notify([recipientId], {
      type: "message",
      title: sender?.name ?? "New message",
      body: body.slice(0, 120),
      data: { peerId: senderId, peerName: sender?.name ?? "Resident" },
    });
  }

  /** A resident pings staff — "Send Message" to admin/security, or a "Security Alert" broadcast. */
  async notifyStaffAlert(
    societyId: string,
    fromUserId: string,
    roles: ("admin" | "guard")[],
    input: { emergency: boolean; label: string },
  ) {
    const [from] = await db
      .select({ name: usersTable.fullName, flatNumber: flatsTable.flatNumber })
      .from(usersTable)
      .leftJoin(flatsTable, eq(flatsTable.id, usersTable.flatId))
      .where(eq(usersTable.id, fromUserId))
      .limit(1);

    const recipients = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.societyId, societyId),
          inArray(usersTable.role, roles),
          isNull(usersTable.deletedAt),
        ),
      );

    const who = `${from?.name ?? "A resident"}${from?.flatNumber ? ` (${from.flatNumber})` : ""}`;

    // fromUserId + fromName let staff acknowledge with a one-tap auto-reply to the sender.
    await this.notify(
      recipients.map((r) => r.id),
      input.emergency
        ? {
            type: "alert",
            title: `🚨 ${input.label}`,
            body: `${who} raised a "${input.label}" alert. Please respond immediately.`,
            data: { alert: input.label, fromUserId, fromName: from?.name ?? "Resident" },
          }
        : {
            type: "message",
            title: `Message from ${who}`,
            body: `${who} wants to reach ${roles.includes("admin") ? "the admin" : "security"}.`,
            data: { fromUserId, fromName: from?.name ?? "Resident" },
          },
    );
  }

  /** A guard files a report/incident to the society admin(s). */
  async notifyGuardReport(
    societyId: string,
    fromGuardId: string,
    input: { label: string; note: string; emergency: boolean },
  ) {
    const [guard] = await db
      .select({ name: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, fromGuardId))
      .limit(1);

    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "admin")));

    const who = guard?.name ?? "A guard";
    const note = input.note.trim();

    await this.notify(
      admins.map((a) => a.id),
      input.emergency
        ? {
            type: "alert",
            title: `🚨 Gate report: ${input.label}`,
            body: `${who} reported "${input.label}"${note ? `: ${note}` : ""}. Please respond immediately.`,
            data: { alert: input.label, fromUserId: fromGuardId, fromName: who },
          }
        : {
            type: "message",
            title: `Report from ${who}`,
            body: `${input.label}${note ? `: ${note}` : ""}`,
            data: { fromUserId: fromGuardId, fromName: who },
          },
    );
  }
}

export default NotificationService;
