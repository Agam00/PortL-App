import { TRPCError } from "@trpc/server";
import { db, eq, and, or, ilike, gt, gte, lte, isNull, inArray, desc } from "@repo/database";
import { visitorsTable, visitorLogsTable, flatsTable, towersTable } from "@repo/database/schema";
import type { VisitorOutput } from "./model";

type VisitorRow = typeof visitorsTable.$inferSelect;

function serialize(
  row: VisitorRow,
  flatNumber: string | null,
  logs?: { entryAt: string | null; exitAt: string | null },
): VisitorOutput {
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
    validFrom: row.validFrom ? row.validFrom.toISOString() : null,
    validUntil: row.validUntil ? row.validUntil.toISOString() : null,
    passCode: row.passCode ?? null,
    keepAtGate: row.keepAtGate ?? false,
    entryAt: logs?.entryAt ?? null,
    exitAt: logs?.exitAt ?? null,
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

    if (rows.length === 0) return [];

    const logRows = await db
      .select()
      .from(visitorLogsTable)
      .where(inArray(visitorLogsTable.visitorId, rows.map((r) => r.visitor.id)));

    const logsByVisitor = new Map<string, { entryAt: string | null; exitAt: string | null }>();
    for (const log of logRows) {
      const entry = logsByVisitor.get(log.visitorId) ?? { entryAt: null, exitAt: null };
      const occurredAt = (log.occurredAt ?? new Date()).toISOString();
      if (log.action === "entry") entry.entryAt = occurredAt;
      else entry.exitAt = occurredAt;
      logsByVisitor.set(log.visitorId, entry);
    }

    return rows.map((row) => serialize(row.visitor, row.flatNumber, logsByVisitor.get(row.visitor.id)));
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
    if (
      opts.action === "entry" &&
      row.visitor.source === "resident_preapproved" &&
      row.visitor.validUntil &&
      row.visitor.validUntil.getTime() < Date.now()
    ) {
      throw new TRPCError({ code: "CONFLICT", message: "This pre-approval has expired" });
    }

    const [log] = await db
      .insert(visitorLogsTable)
      .values({ visitorId, guardId, action: opts.action })
      .returning();

    const [updated] = await db
      .update(visitorsTable)
      .set({ status: opts.to })
      .where(eq(visitorsTable.id, visitorId))
      .returning();

    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const occurredAt = (log?.occurredAt ?? new Date()).toISOString();
    return serialize(
      updated,
      row.flatNumber,
      opts.action === "entry" ? { entryAt: occurredAt, exitAt: null } : { entryAt: null, exitAt: occurredAt },
    );
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

  /**
   * Release a package held at the gate. The resident reads back their 6-digit pass code
   * (the collection OTP); the guard types it here. On a match the package is logged as
   * handed over and the pre-approval is closed out.
   */
  async collectPackage(
    societyId: string,
    guardId: string,
    visitorId: string,
    code: string,
  ): Promise<VisitorOutput> {
    const [row] = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(and(eq(visitorsTable.id, visitorId), eq(visitorsTable.societyId, societyId)))
      .limit(1);

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Pre-approval not found" });
    const v = row.visitor;
    if (v.type !== "delivery" || !v.keepAtGate) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This pass isn't a package held at the gate" });
    }
    if (v.status !== "approved") {
      throw new TRPCError({ code: "CONFLICT", message: `This package is already "${v.status}"` });
    }
    if (!v.passCode || v.passCode !== code) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Incorrect code — ask the resident to read it from My Pre-approvals",
      });
    }

    const [log] = await db
      .insert(visitorLogsTable)
      .values({ visitorId, guardId, action: "exit" })
      .returning();

    const [updated] = await db
      .update(visitorsTable)
      .set({ status: "checked_out" })
      .where(eq(visitorsTable.id, visitorId))
      .returning();

    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const occurredAt = (log?.occurredAt ?? new Date()).toISOString();
    return serialize(updated, row.flatNumber, { entryAt: null, exitAt: occurredAt });
  }

  /** A 6-digit gate-pass code, unique among this society's visitors. */
  private async generatePassCode(societyId: string): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const [clash] = await db
        .select({ id: visitorsTable.id })
        .from(visitorsTable)
        .where(and(eq(visitorsTable.societyId, societyId), eq(visitorsTable.passCode, code)))
        .limit(1);
      if (!clash) return code;
    }
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async preApprove(
    societyId: string,
    flatId: string,
    userId: string,
    input: {
      name: string;
      phone?: string;
      type: VisitorRow["type"];
      validFrom: string;
      validUntil: string;
      keepAtGate?: boolean;
    },
  ): Promise<VisitorOutput> {
    const validFrom = new Date(input.validFrom);
    const validUntil = new Date(input.validUntil);
    if (validUntil <= validFrom) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Valid-until must be after valid-from" });
    }

    const passCode = await this.generatePassCode(societyId);
    // Only a delivery can be held at the gate; any other type always enters.
    const keepAtGate = input.type === "delivery" && input.keepAtGate === true;

    const [visitor] = await db
      .insert(visitorsTable)
      .values({
        societyId,
        flatId,
        name: input.name,
        phone: input.phone,
        type: input.type,
        source: "resident_preapproved",
        status: "approved",
        decidedByUserId: userId,
        decidedAt: new Date(),
        validFrom,
        validUntil,
        passCode,
        keepAtGate,
      })
      .returning();

    if (!visitor) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [flat] = await db
      .select({ flatNumber: flatsTable.flatNumber })
      .from(flatsTable)
      .where(eq(flatsTable.id, flatId))
      .limit(1);

    return serialize(visitor, flat?.flatNumber ?? null);
  }

  /** Guard keypad/scan: find a currently-valid pre-approval by its 6-digit code. */
  async lookupByPassCode(societyId: string, code: string): Promise<VisitorOutput> {
    const now = new Date();
    const [row] = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(and(eq(visitorsTable.societyId, societyId), eq(visitorsTable.passCode, code)))
      .limit(1);

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No visitor found for this code" });
    const v = row.visitor;
    if (v.status === "checked_out") {
      throw new TRPCError({ code: "CONFLICT", message: "This visitor has already checked out" });
    }
    if (v.status === "cancelled" || v.status === "rejected" || v.status === "expired") {
      throw new TRPCError({ code: "CONFLICT", message: `This pass is ${v.status}` });
    }
    if (v.validUntil && v.validUntil < now) {
      throw new TRPCError({ code: "CONFLICT", message: "This pass has expired" });
    }
    return serialize(v, row.flatNumber);
  }

  async cancelPreApproval(flatId: string, visitorId: string): Promise<VisitorOutput> {
    const [visitor] = await db
      .select()
      .from(visitorsTable)
      .where(eq(visitorsTable.id, visitorId))
      .limit(1);

    if (!visitor) throw new TRPCError({ code: "NOT_FOUND", message: "Pre-approval not found" });
    if (visitor.flatId !== flatId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This pre-approval is not for your flat" });
    }
    if (visitor.source !== "resident_preapproved") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Only pre-approvals can be cancelled" });
    }
    if (visitor.status !== "approved") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Cannot cancel a pre-approval that is already "${visitor.status}"`,
      });
    }

    const [updated] = await db
      .update(visitorsTable)
      .set({ status: "cancelled" })
      .where(eq(visitorsTable.id, visitorId))
      .returning();

    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(updated, null);
  }

  async listPreApprovedForResident(flatId: string): Promise<VisitorOutput[]> {
    const rows = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(and(eq(visitorsTable.flatId, flatId), eq(visitorsTable.source, "resident_preapproved")))
      .orderBy(desc(visitorsTable.validFrom));

    return rows.map((row) => serialize(row.visitor, row.flatNumber));
  }

  async searchPreApproved(societyId: string, query: string): Promise<VisitorOutput[]> {
    const like = `%${query}%`;
    const now = new Date();

    const rows = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(
        and(
          eq(visitorsTable.societyId, societyId),
          eq(visitorsTable.source, "resident_preapproved"),
          eq(visitorsTable.status, "approved"),
          or(isNull(visitorsTable.validUntil), gt(visitorsTable.validUntil, now)),
          or(ilike(visitorsTable.name, like), ilike(visitorsTable.phone, like)),
        ),
      )
      .orderBy(desc(visitorsTable.createdAt))
      .limit(20);

    return rows.map((row) => serialize(row.visitor, row.flatNumber));
  }

  /** Scoped by flat (resident) or society (guard/admin), with optional type/status/date-range filters. */
  async history(
    scope: { flatId: string } | { societyId: string },
    filters: { type?: VisitorRow["type"]; status?: VisitorRow["status"]; fromDate?: string; toDate?: string },
  ): Promise<VisitorOutput[]> {
    const conditions = [
      "flatId" in scope ? eq(visitorsTable.flatId, scope.flatId) : eq(visitorsTable.societyId, scope.societyId),
    ];
    if (filters.type) conditions.push(eq(visitorsTable.type, filters.type));
    if (filters.status) conditions.push(eq(visitorsTable.status, filters.status));
    if (filters.fromDate) conditions.push(gte(visitorsTable.createdAt, new Date(filters.fromDate)));
    if (filters.toDate) conditions.push(lte(visitorsTable.createdAt, new Date(filters.toDate)));

    const rows = await db
      .select({ visitor: visitorsTable, flatNumber: flatsTable.flatNumber })
      .from(visitorsTable)
      .innerJoin(flatsTable, eq(visitorsTable.flatId, flatsTable.id))
      .where(and(...conditions))
      .orderBy(desc(visitorsTable.createdAt))
      .limit(100);

    if (rows.length === 0) return [];

    const logRows = await db
      .select()
      .from(visitorLogsTable)
      .where(inArray(visitorLogsTable.visitorId, rows.map((r) => r.visitor.id)));

    const logsByVisitor = new Map<string, { entryAt: string | null; exitAt: string | null }>();
    for (const log of logRows) {
      const entry = logsByVisitor.get(log.visitorId) ?? { entryAt: null, exitAt: null };
      const occurredAt = (log.occurredAt ?? new Date()).toISOString();
      if (log.action === "entry") entry.entryAt = occurredAt;
      else entry.exitAt = occurredAt;
      logsByVisitor.set(log.visitorId, entry);
    }

    return rows.map((row) => serialize(row.visitor, row.flatNumber, logsByVisitor.get(row.visitor.id)));
  }
}

export default VisitorService;
