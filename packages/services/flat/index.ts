import { TRPCError } from "@trpc/server";
import { db, eq, and, count } from "@repo/database";
import { flatsTable, towersTable, usersTable } from "@repo/database/schema";
import type { FlatOutput } from "./model";

class FlatService {
  private async requireOwnedTower(societyId: string, towerId: string) {
    const [tower] = await db.select().from(towersTable).where(eq(towersTable.id, towerId)).limit(1);
    if (!tower || tower.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tower not found" });
    }
    return tower;
  }

  private async requireOwnedFlat(societyId: string, flatId: string) {
    const [row] = await db
      .select({ flat: flatsTable, tower: towersTable })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .where(eq(flatsTable.id, flatId))
      .limit(1);
    if (!row || row.tower.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flat not found" });
    }
    return row.flat;
  }

  async create(
    societyId: string,
    input: { towerId: string; flatNumber: string; floor?: number; type?: string },
  ): Promise<FlatOutput> {
    const tower = await this.requireOwnedTower(societyId, input.towerId);

    const [flat] = await db
      .insert(flatsTable)
      .values({ towerId: input.towerId, flatNumber: input.flatNumber, floor: input.floor, type: input.type })
      .returning();
    if (!flat) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return { ...flat, towerName: tower.name, residentCount: 0, createdAt: flat.createdAt?.toISOString() ?? null };
  }

  async list(societyId: string, towerId?: string): Promise<FlatOutput[]> {
    const rows = await db
      .select({
        id: flatsTable.id,
        towerId: flatsTable.towerId,
        towerName: towersTable.name,
        flatNumber: flatsTable.flatNumber,
        floor: flatsTable.floor,
        type: flatsTable.type,
        createdAt: flatsTable.createdAt,
        residentCount: count(usersTable.id),
      })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .leftJoin(usersTable, and(eq(usersTable.flatId, flatsTable.id), eq(usersTable.role, "resident")))
      .where(towerId ? and(eq(towersTable.societyId, societyId), eq(flatsTable.towerId, towerId)) : eq(towersTable.societyId, societyId))
      .groupBy(flatsTable.id, towersTable.name)
      .orderBy(towersTable.name, flatsTable.flatNumber);

    return rows.map((row) => ({ ...row, createdAt: row.createdAt?.toISOString() ?? null }));
  }

  async update(
    societyId: string,
    input: { flatId: string; flatNumber?: string; floor?: number; type?: string },
  ): Promise<FlatOutput> {
    const existing = await this.requireOwnedFlat(societyId, input.flatId);

    const [updated] = await db
      .update(flatsTable)
      .set({
        ...(input.flatNumber && { flatNumber: input.flatNumber }),
        ...(input.floor !== undefined && { floor: input.floor }),
        ...(input.type !== undefined && { type: input.type }),
      })
      .where(eq(flatsTable.id, existing.id))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [tower] = await db.select().from(towersTable).where(eq(towersTable.id, updated.towerId)).limit(1);
    const [residentCountRow] = await db
      .select({ residentCount: count() })
      .from(usersTable)
      .where(and(eq(usersTable.flatId, updated.id), eq(usersTable.role, "resident")));

    return {
      ...updated,
      towerName: tower?.name ?? "",
      residentCount: residentCountRow?.residentCount ?? 0,
      createdAt: updated.createdAt?.toISOString() ?? null,
    };
  }

  async remove(societyId: string, flatId: string): Promise<void> {
    const flat = await this.requireOwnedFlat(societyId, flatId);

    const [residentCountRow] = await db
      .select({ residentCount: count() })
      .from(usersTable)
      .where(eq(usersTable.flatId, flat.id));
    if ((residentCountRow?.residentCount ?? 0) > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "Reassign or remove this flat's residents first" });
    }

    await db.delete(flatsTable).where(eq(flatsTable.id, flat.id));
  }
}

export default FlatService;
