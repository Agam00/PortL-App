import { TRPCError } from "@trpc/server";
import { db, eq, and, alias, inArray, sql } from "@repo/database";
import { complaintsTable, usersTable, flatsTable, complaintCommentsTable } from "@repo/database/schema";
import type { ComplaintOutput, ComplaintCommentOutput } from "./model";

const raisedByUser = alias(usersTable, "raised_by_user");
const assignedToUser = alias(usersTable, "assigned_to_user");

function baseComplaintQuery() {
  return db
    .select({
      id: complaintsTable.id,
      category: complaintsTable.category,
      title: complaintsTable.title,
      description: complaintsTable.description,
      photoUrl: complaintsTable.photoUrl,
      status: complaintsTable.status,
      priority: complaintsTable.priority,
      raisedByUserId: complaintsTable.raisedByUserId,
      raisedByName: raisedByUser.fullName,
      flatNumber: flatsTable.flatNumber,
      assignedToUserId: complaintsTable.assignedToUserId,
      assignedToName: assignedToUser.fullName,
      createdAt: complaintsTable.createdAt,
      resolvedAt: complaintsTable.resolvedAt,
    })
    .from(complaintsTable)
    .innerJoin(raisedByUser, eq(raisedByUser.id, complaintsTable.raisedByUserId))
    .leftJoin(assignedToUser, eq(assignedToUser.id, complaintsTable.assignedToUserId))
    .leftJoin(flatsTable, eq(flatsTable.id, raisedByUser.flatId));
}

function serializeComplaintRow(row: Awaited<ReturnType<typeof baseComplaintQuery>>[number]): ComplaintOutput {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

class ComplaintService {
  async listForAdmin(societyId: string, status?: "open" | "in_progress" | "resolved" | "closed"): Promise<ComplaintOutput[]> {
    const rows = await baseComplaintQuery()
      .where(status ? and(eq(complaintsTable.societyId, societyId), eq(complaintsTable.status, status)) : eq(complaintsTable.societyId, societyId))
      .orderBy(complaintsTable.createdAt);

    return rows.reverse().map(serializeComplaintRow);
  }

  async getById(complaintId: string): Promise<ComplaintOutput | null> {
    const [row] = await baseComplaintQuery().where(eq(complaintsTable.id, complaintId)).limit(1);
    return row ? serializeComplaintRow(row) : null;
  }

  async create(
    societyId: string,
    userId: string,
    input: { category: string; title: string; description: string; photoBase64?: string },
  ): Promise<ComplaintOutput> {
    const [complaint] = await db
      .insert(complaintsTable)
      .values({
        societyId,
        raisedByUserId: userId,
        category: input.category,
        title: input.title,
        description: input.description,
        photoUrl: input.photoBase64,
      })
      .returning();
    if (!complaint) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const created = await this.getById(complaint.id);
    if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return created;
  }

  async listMine(userId: string): Promise<ComplaintOutput[]> {
    const rows = await baseComplaintQuery().where(eq(complaintsTable.raisedByUserId, userId)).orderBy(complaintsTable.createdAt);
    return rows.reverse().map(serializeComplaintRow);
  }

  /** Community board: every complaint in the society, tagged with the caller's own + a comment count. */
  async listForResident(societyId: string, userId: string): Promise<ComplaintOutput[]> {
    const rows = await baseComplaintQuery().where(eq(complaintsTable.societyId, societyId)).orderBy(complaintsTable.createdAt);

    const ids = rows.map((r) => r.id);
    const countRows = ids.length
      ? await db
          .select({ complaintId: complaintCommentsTable.complaintId, count: sql<number>`count(*)::int` })
          .from(complaintCommentsTable)
          .where(inArray(complaintCommentsTable.complaintId, ids))
          .groupBy(complaintCommentsTable.complaintId)
      : [];
    const countMap = new Map(countRows.map((r) => [r.complaintId, r.count]));

    return rows.reverse().map((row) => ({
      ...serializeComplaintRow(row),
      commentCount: countMap.get(row.id) ?? 0,
      isMine: row.raisedByUserId === userId,
    }));
  }

  /** A resident may only flip their own complaint between resolved and open (re-open). */
  async setStatusByRaiser(userId: string, complaintId: string, status: "resolved" | "open"): Promise<ComplaintOutput> {
    const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, complaintId)).limit(1);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found" });
    if (existing.raisedByUserId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only update your own complaints" });
    }

    await db
      .update(complaintsTable)
      .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
      .where(eq(complaintsTable.id, complaintId));

    const updated = await this.getById(complaintId);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  async update(
    societyId: string,
    input: {
      complaintId: string;
      status?: "open" | "in_progress" | "resolved" | "closed";
      priority?: "low" | "medium" | "high";
      assignedToUserId?: string | null;
    },
  ): Promise<ComplaintOutput> {
    const [existing] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, input.complaintId)).limit(1);
    if (!existing || existing.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found" });
    }

    const isNowResolved = input.status === "resolved" || input.status === "closed";

    await db
      .update(complaintsTable)
      .set({
        ...(input.status && { status: input.status }),
        ...(input.priority && { priority: input.priority }),
        ...(input.assignedToUserId !== undefined && { assignedToUserId: input.assignedToUserId }),
        ...(isNowResolved && { resolvedAt: new Date() }),
      })
      .where(eq(complaintsTable.id, input.complaintId));

    const updated = await this.getById(input.complaintId);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  private async requireCommentAccess(
    complaintId: string,
    userId: string,
    role: "resident" | "guard" | "admin",
    societyId: string | null,
  ) {
    const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, complaintId)).limit(1);
    if (!complaint) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found" });
    }
    // Community board: a resident can read/discuss any complaint in their own society (not just their own).
    if (role === "resident" && complaint.societyId !== societyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This complaint isn't in your society" });
    }
    return complaint;
  }

  async listComments(
    complaintId: string,
    userId: string,
    role: "resident" | "guard" | "admin",
    societyId: string | null,
  ): Promise<ComplaintCommentOutput[]> {
    await this.requireCommentAccess(complaintId, userId, role, societyId);

    const rows = await db
      .select({
        id: complaintCommentsTable.id,
        complaintId: complaintCommentsTable.complaintId,
        authorId: complaintCommentsTable.authorId,
        authorName: usersTable.fullName,
        authorRole: usersTable.role,
        body: complaintCommentsTable.body,
        createdAt: complaintCommentsTable.createdAt,
      })
      .from(complaintCommentsTable)
      .innerJoin(usersTable, eq(usersTable.id, complaintCommentsTable.authorId))
      .where(eq(complaintCommentsTable.complaintId, complaintId))
      .orderBy(complaintCommentsTable.createdAt);

    return rows.map((row) => ({ ...row, createdAt: row.createdAt?.toISOString() ?? null }));
  }

  async addComment(
    complaintId: string,
    userId: string,
    role: "resident" | "guard" | "admin",
    body: string,
    societyId: string | null,
  ): Promise<ComplaintCommentOutput> {
    await this.requireCommentAccess(complaintId, userId, role, societyId);

    const [comment] = await db
      .insert(complaintCommentsTable)
      .values({ complaintId, authorId: userId, body })
      .returning();
    if (!comment) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [author] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    return {
      id: comment.id,
      complaintId: comment.complaintId,
      authorId: comment.authorId,
      authorName: author?.fullName ?? "",
      authorRole: role,
      body: comment.body,
      createdAt: comment.createdAt?.toISOString() ?? null,
    };
  }
}

export default ComplaintService;
