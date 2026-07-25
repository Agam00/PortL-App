import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { db, eq, and, sql, desc, isNotNull, isNull } from "@repo/database";
import {
  duesTable,
  flatsTable,
  towersTable,
  paymentsTable,
  societiesTable,
  usersTable,
} from "@repo/database/schema";
import type { DueOutput, PaymentSettingsOutput } from "./model";

function baseQuery() {
  return db
    .select({
      id: duesTable.id,
      flatId: duesTable.flatId,
      flatNumber: flatsTable.flatNumber,
      towerName: towersTable.name,
      period: duesTable.period,
      title: duesTable.title,
      amount: duesTable.amount,
      status: duesTable.status,
      dueDate: duesTable.dueDate,
      createdAt: duesTable.createdAt,
    })
    .from(duesTable)
    .innerJoin(flatsTable, eq(flatsTable.id, duesTable.flatId))
    .innerJoin(towersTable, eq(towersTable.id, flatsTable.towerId));
}

async function enrich(row: Awaited<ReturnType<typeof baseQuery>>[number]): Promise<DueOutput> {
  // Latest successful payment for this due — used for paidAt + proof/verification flags.
  const [payment] = await db
    .select({
      paidAt: paymentsTable.paidAt,
      verified: paymentsTable.verified,
      hasProof: sql<boolean>`${paymentsTable.proofImage} is not null`,
    })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.dueId, row.id), eq(paymentsTable.status, "success")))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(1);

  const verified = payment?.verified ?? false;
  const isOverdue = row.status === "pending" && new Date(row.dueDate).getTime() < Date.now();

  return {
    ...row,
    title: row.title ?? null,
    isOverdue,
    // Only an admin-approved payment counts as "paid on".
    paidAt: verified ? (payment?.paidAt?.toISOString() ?? null) : null,
    hasProof: payment?.hasProof ?? false,
    verified,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

class DueService {
  /** Creates a charge for a single flat or for every resident's flat. Returns the count made. */
  async create(
    societyId: string,
    input: { title?: string; amount: number; dueDate: string; applyToAll?: boolean; flatId?: string },
  ): Promise<{ count: number }> {
    const period = input.dueDate.slice(0, 7); // YYYY-MM
    const amount = input.amount.toFixed(2);
    const title = input.title?.trim() || null;

    if (input.applyToAll) {
      // Every distinct flat that has a (non-deleted) resident in this society.
      const flatRows = await db
        .selectDistinct({ flatId: usersTable.flatId })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.societyId, societyId),
            eq(usersTable.role, "resident"),
            isNotNull(usersTable.flatId),
            isNull(usersTable.deletedAt),
          ),
        );
      const flatIds = flatRows.map((r) => r.flatId).filter((id): id is string => !!id);
      if (flatIds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No residents to charge yet" });
      }
      await db
        .insert(duesTable)
        .values(flatIds.map((flatId) => ({ flatId, period, title, amount, dueDate: input.dueDate })));
      return { count: flatIds.length };
    }

    if (!input.flatId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a flat or apply to all residents" });
    }
    const [flat] = await db
      .select({ flat: flatsTable, tower: towersTable })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .where(eq(flatsTable.id, input.flatId))
      .limit(1);
    if (!flat || flat.tower.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flat not found" });
    }
    await db.insert(duesTable).values({ flatId: input.flatId, period, title, amount, dueDate: input.dueDate });
    return { count: 1 };
  }

  async getById(dueId: string): Promise<DueOutput | null> {
    const [row] = await baseQuery().where(eq(duesTable.id, dueId)).limit(1);
    return row ? enrich(row) : null;
  }

  async listForAdmin(societyId: string): Promise<DueOutput[]> {
    const rows = await baseQuery().where(eq(towersTable.societyId, societyId)).orderBy(duesTable.dueDate);
    return Promise.all(rows.reverse().map(enrich));
  }

  async listForFlat(flatId: string): Promise<DueOutput[]> {
    const rows = await baseQuery().where(eq(duesTable.flatId, flatId)).orderBy(duesTable.dueDate);
    return Promise.all(rows.reverse().map(enrich));
  }

  // ---- UPI collection settings (society-level) ----

  async getPaymentSettings(societyId: string): Promise<PaymentSettingsOutput> {
    const [row] = await db
      .select({ upiId: societiesTable.upiId, upiName: societiesTable.upiName })
      .from(societiesTable)
      .where(eq(societiesTable.id, societyId))
      .limit(1);
    return { upiId: row?.upiId ?? null, upiName: row?.upiName ?? null };
  }

  async setPaymentSettings(
    societyId: string,
    input: { upiId: string; upiName?: string },
  ): Promise<PaymentSettingsOutput> {
    await db
      .update(societiesTable)
      .set({ upiId: input.upiId, upiName: input.upiName?.trim() || null })
      .where(eq(societiesTable.id, societyId));
    return this.getPaymentSettings(societyId);
  }

  // ---- Resident UPI payment ----

  /**
   * Resident reports a payment and attaches a screenshot. The due is NOT marked paid yet —
   * it stays pending with an unverified proof ("under review") until an admin approves it.
   */
  async submitUpiPayment(flatId: string, dueId: string, proofImage: string): Promise<DueOutput> {
    const [due] = await db.select().from(duesTable).where(eq(duesTable.id, dueId)).limit(1);
    if (!due || due.flatId !== flatId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Due not found" });
    }
    if (due.status === "paid") {
      throw new TRPCError({ code: "CONFLICT", message: "This due has already been paid" });
    }
    // Block a second submission while one is already awaiting approval.
    const [pendingProof] = await db
      .select({ id: paymentsTable.id })
      .from(paymentsTable)
      .where(
        and(eq(paymentsTable.dueId, dueId), eq(paymentsTable.status, "success"), eq(paymentsTable.verified, false)),
      )
      .limit(1);
    if (pendingProof) {
      throw new TRPCError({ code: "CONFLICT", message: "Payment already submitted — waiting for admin approval" });
    }

    await db.insert(paymentsTable).values({
      dueId,
      amount: due.amount,
      provider: "upi",
      providerRefId: `UPI-${randomBytes(4).toString("hex").toUpperCase()}`,
      status: "success",
      proofImage,
      verified: false,
      paidAt: new Date(),
    });

    const updated = await this.getById(dueId);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  private async requireDueInSociety(societyId: string, dueId: string) {
    const [row] = await db
      .select({ dueId: duesTable.id, societyId: towersTable.societyId })
      .from(duesTable)
      .innerJoin(flatsTable, eq(flatsTable.id, duesTable.flatId))
      .innerJoin(towersTable, eq(towersTable.id, flatsTable.towerId))
      .where(eq(duesTable.id, dueId))
      .limit(1);
    if (!row || row.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Due not found" });
    }
  }

  private async pendingProofPaymentId(dueId: string): Promise<string | null> {
    const [p] = await db
      .select({ id: paymentsTable.id })
      .from(paymentsTable)
      .where(
        and(eq(paymentsTable.dueId, dueId), eq(paymentsTable.status, "success"), eq(paymentsTable.verified, false)),
      )
      .orderBy(desc(paymentsTable.createdAt))
      .limit(1);
    return p?.id ?? null;
  }

  /** Admin approves a submitted payment → the due becomes paid. */
  async approvePayment(societyId: string, dueId: string): Promise<DueOutput> {
    await this.requireDueInSociety(societyId, dueId);
    const paymentId = await this.pendingProofPaymentId(dueId);
    if (!paymentId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No payment awaiting approval" });
    }
    await db.update(paymentsTable).set({ verified: true }).where(eq(paymentsTable.id, paymentId));
    await db.update(duesTable).set({ status: "paid" }).where(eq(duesTable.id, dueId));

    const updated = await this.getById(dueId);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  /** Admin rejects a submitted payment → the due goes back to pending; resident can resubmit. */
  async rejectPayment(societyId: string, dueId: string): Promise<DueOutput> {
    await this.requireDueInSociety(societyId, dueId);
    const paymentId = await this.pendingProofPaymentId(dueId);
    if (!paymentId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No payment awaiting approval" });
    }
    // Mark failed so it no longer counts as a submission (hasProof falls back to false).
    await db.update(paymentsTable).set({ status: "failed" }).where(eq(paymentsTable.id, paymentId));
    await db.update(duesTable).set({ status: "pending" }).where(eq(duesTable.id, dueId));

    const updated = await this.getById(dueId);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  /** Admin fetches the payment screenshot for a due (kept out of list payloads). */
  async getProof(societyId: string, dueId: string): Promise<{ proofImage: string | null }> {
    const [row] = await db
      .select({ societyId: towersTable.societyId })
      .from(duesTable)
      .innerJoin(flatsTable, eq(flatsTable.id, duesTable.flatId))
      .innerJoin(towersTable, eq(towersTable.id, flatsTable.towerId))
      .where(eq(duesTable.id, dueId))
      .limit(1);
    if (!row || row.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Due not found" });
    }
    const [payment] = await db
      .select({ proofImage: paymentsTable.proofImage })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.dueId, dueId), eq(paymentsTable.status, "success")))
      .orderBy(desc(paymentsTable.createdAt))
      .limit(1);
    return { proofImage: payment?.proofImage ?? null };
  }

  async payMock(flatId: string, dueId: string): Promise<DueOutput> {
    const [due] = await db.select().from(duesTable).where(eq(duesTable.id, dueId)).limit(1);
    if (!due || due.flatId !== flatId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Due not found" });
    }
    if (due.status === "paid") {
      throw new TRPCError({ code: "CONFLICT", message: "This due has already been paid" });
    }

    await db.insert(paymentsTable).values({
      dueId,
      amount: due.amount,
      provider: "mock",
      providerRefId: `MOCK-${randomBytes(4).toString("hex").toUpperCase()}`,
      status: "success",
      paidAt: new Date(),
    });
    await db.update(duesTable).set({ status: "paid" }).where(eq(duesTable.id, dueId));

    const updated = await this.getById(dueId);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }
}

export default DueService;
