import { TRPCError } from "@trpc/server";
import { db, eq, and, desc } from "@repo/database";
import { visitorsTable, flatsTable, towersTable } from "@repo/database/schema";
import type { VisitorOutput } from "./model";

type VisitorRow = typeof visitorsTable.$inferSelect;

function serialize(row: VisitorRow, flatNumber: string | null): VisitorOutput {
  return {
    id: row.id,
    flatId: row.flatId,
    flatNumber,
    name: row.name,
    phone: row.phone,
    photoUrl: row.photoUrl,
    type: row.type,
    source: row.source,
    status: row.status,
    requestedByGuardId: row.requestedByGuardId,
    decidedByUserId: row.decidedByUserId,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
  };
}

class VisitorService {
  async create(
    societyId: string,
    guardId: string,
    input: { flatNumber: string; name: string; phone?: string; type: VisitorRow["type"] },
  ): Promise<VisitorOutput> {
    const [flat] = await db
      .select({ id: flatsTable.id, flatNumber: flatsTable.flatNumber })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .where(and(eq(towersTable.societyId, societyId), eq(flatsTable.flatNumber, input.flatNumber)))
      .limit(1);

    if (!flat) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `No flat found with number "${input.flatNumber}"`,
      });
    }

    const [visitor] = await db
      .insert(visitorsTable)
      .values({
        societyId,
        flatId: flat.id,
        name: input.name,
        phone: input.phone,
        type: input.type,
        source: "guard_initiated",
        status: "pending",
        requestedByGuardId: guardId,
      })
      .returning();

    if (!visitor) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(visitor, flat.flatNumber);
  }

  async listPendingForResident(flatId: string): Promise<VisitorOutput[]> {
    const rows = await db
      .select()
      .from(visitorsTable)
      .where(and(eq(visitorsTable.flatId, flatId), eq(visitorsTable.status, "pending")))
      .orderBy(desc(visitorsTable.createdAt));

    return rows.map((row) => serialize(row, null));
  }

  async decide(
    userId: string,
    flatId: string,
    input: { visitorId: string; decision: "approved" | "rejected" },
  ): Promise<VisitorOutput> {
    const [visitor] = await db
      .select()
      .from(visitorsTable)
      .where(eq(visitorsTable.id, input.visitorId))
      .limit(1);

    if (!visitor) throw new TRPCError({ code: "NOT_FOUND", message: "Visitor request not found" });
    if (visitor.flatId !== flatId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This request is not for your flat" });
    }
    if (visitor.status !== "pending") {
      throw new TRPCError({ code: "CONFLICT", message: "This request has already been decided" });
    }

    const [updated] = await db
      .update(visitorsTable)
      .set({ status: input.decision, decidedByUserId: userId, decidedAt: new Date() })
      .where(eq(visitorsTable.id, input.visitorId))
      .returning();

    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(updated, null);
  }

  async listForGuard(guardId: string): Promise<VisitorOutput[]> {
    const rows = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(eq(visitorsTable.requestedByGuardId, guardId))
      .orderBy(desc(visitorsTable.createdAt))
      .limit(50);

    return rows.map((row) => serialize(row.visitor, row.flatNumber));
  }
}

export default VisitorService;
