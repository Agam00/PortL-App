import { TRPCError } from "@trpc/server";
import { db, eq, and, alias } from "@repo/database";
import { complaintsTable, usersTable, flatsTable } from "@repo/database/schema";
import type { ComplaintOutput } from "./model";

const raisedByUser = alias(usersTable, "raised_by_user");
const assignedToUser = alias(usersTable, "assigned_to_user");

class ComplaintService {
  async listForAdmin(societyId: string, status?: "open" | "in_progress" | "resolved" | "closed"): Promise<ComplaintOutput[]> {
    const rows = await db
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
      .leftJoin(flatsTable, eq(flatsTable.id, raisedByUser.flatId))
      .where(status ? and(eq(complaintsTable.societyId, societyId), eq(complaintsTable.status, status)) : eq(complaintsTable.societyId, societyId))
      .orderBy(complaintsTable.createdAt);

    return rows.reverse().map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    }));
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

    const match = (await this.listForAdmin(societyId)).find((c) => c.id === input.complaintId);
    if (!match) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return match;
  }
}

export default ComplaintService;
