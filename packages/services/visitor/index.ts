import { TRPCError } from "@trpc/server";
import { db, eq, and, desc } from "@repo/database";
import { visitorsTable, visitorLogsTable, flatsTable, towersTable } from "@repo/database/schema";
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
    input: {
      flatId: string;
      name: string;
      phone?: string;
      type: VisitorRow["type"];
      photoBase64?: string;
    },
  ): Promise<VisitorOutput> {
    const [flat] = await db
      .select({ id: flatsTable.id, flatNumber: flatsTable.flatNumber })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .where(and(eq(towersTable.societyId, societyId), eq(flatsTable.id, input.flatId)))
      .limit(1);

    if (!flat) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flat not found in your society" });
    }

    const [visitor] = await db
      .insert(visitorsTable)
      .values({
        societyId,
        flatId: flat.id,
        name: input.name,
        phone: input.phone,
        photoUrl: input.photoBase64,
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

  /** Society-wide, not per-guard — a real gate has multiple guards sharing one queue across shifts. */
  async listForGuard(societyId: string): Promise<VisitorOutput[]> {
    const rows = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(eq(visitorsTable.societyId, societyId))
      .orderBy(desc(visitorsTable.createdAt))
      .limit(50);

    return rows.map((row) => serialize(row.visitor, row.flatNumber));
  }

  private async transitionStatus(
    societyId: string,
    guardId: string,
    visitorId: string,
    opts: { from: VisitorRow["status"]; to: VisitorRow["status"]; action: "entry" | "exit" },
  ): Promise<VisitorOutput> {
    const [row] = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(and(eq(visitorsTable.id, visitorId), eq(visitorsTable.societyId, societyId)))
      .limit(1);

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Visitor request not found" });
    if (row.visitor.status !== opts.from) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Visitor must be "${opts.from}" to mark ${opts.action} (currently "${row.visitor.status}")`,
      });
    }

    await db.insert(visitorLogsTable).values({ visitorId, guardId, action: opts.action });

    const [updated] = await db
      .update(visitorsTable)
      .set({ status: opts.to })
      .where(eq(visitorsTable.id, visitorId))
      .returning();

    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(updated, row.flatNumber);
  }

  async markEntry(societyId: string, guardId: string, visitorId: string): Promise<VisitorOutput> {
    return this.transitionStatus(societyId, guardId, visitorId, {
      from: "approved",
      to: "checked_in",
      action: "entry",
    });
  }

  async markExit(societyId: string, guardId: string, visitorId: string): Promise<VisitorOutput> {
    return this.transitionStatus(societyId, guardId, visitorId, {
      from: "checked_in",
      to: "checked_out",
      action: "exit",
    });
  }
}

export default VisitorService;
