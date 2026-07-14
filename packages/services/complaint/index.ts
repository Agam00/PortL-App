import { TRPCError } from "@trpc/server";
import { db, eq, and, alias } from "@repo/database";
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

  private async requireCommentAccess(complaintId: string, userId: string, role: "resident" | "guard" | "admin") {
    const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, complaintId)).limit(1);
    if (!complaint) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found" });
    }
    if (role === "resident" && complaint.raisedByUserId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This isn't your complaint" });
    }
    return complaint;
  }

  async listComments(complaintId: string, userId: string, role: "resident" | "guard" | "admin"): Promise<ComplaintCommentOutput[]> {
    await this.requireCommentAccess(complaintId, userId, role);

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
  ): Promise<ComplaintCommentOutput> {
    await this.requireCommentAccess(complaintId, userId, role);

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
