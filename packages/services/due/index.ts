import { TRPCError } from "@trpc/server";
import { randomBytes } from "node:crypto";
import { db, eq, and } from "@repo/database";
import { duesTable, flatsTable, towersTable, paymentsTable } from "@repo/database/schema";
import type { DueOutput } from "./model";

function baseQuery() {
  return db
    .select({
      id: duesTable.id,
      flatId: duesTable.flatId,
      flatNumber: flatsTable.flatNumber,
      towerName: towersTable.name,
      period: duesTable.period,
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
  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.dueId, row.id), eq(paymentsTable.status, "success")))
    .limit(1);

  const isOverdue = row.status === "pending" && new Date(row.dueDate).getTime() < Date.now();

  return {
    ...row,
    isOverdue,
    paidAt: payment?.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

class DueService {
  async create(societyId: string, input: { flatId: string; period: string; amount: number; dueDate: string }): Promise<DueOutput> {
    const [flat] = await db
      .select({ flat: flatsTable, tower: towersTable })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .where(eq(flatsTable.id, input.flatId))
      .limit(1);
    if (!flat || flat.tower.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flat not found" });
    }

    const [due] = await db
      .insert(duesTable)
      .values({
        flatId: input.flatId,
        period: input.period,
        amount: input.amount.toFixed(2),
        dueDate: input.dueDate,
      })
      .returning();
    if (!due) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const created = await this.getById(due.id);
    if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return created;
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
