import { TRPCError } from "@trpc/server";
import { db, eq, count } from "@repo/database";
import { towersTable, flatsTable } from "@repo/database/schema";
import type { TowerOutput } from "./model";

class TowerService {
  async create(societyId: string, input: { name: string; code?: string }): Promise<TowerOutput> {
    const [tower] = await db
      .insert(towersTable)
      .values({ societyId, name: input.name, code: input.code })
      .returning();
    if (!tower) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    return { ...tower, flatCount: 0, createdAt: tower.createdAt?.toISOString() ?? null };
  }

  async list(societyId: string): Promise<TowerOutput[]> {
    const rows = await db
      .select({
        id: towersTable.id,
        name: towersTable.name,
        code: towersTable.code,
        createdAt: towersTable.createdAt,
        flatCount: count(flatsTable.id),
      })
      .from(towersTable)
      .leftJoin(flatsTable, eq(flatsTable.towerId, towersTable.id))
      .where(eq(towersTable.societyId, societyId))
      .groupBy(towersTable.id)
      .orderBy(towersTable.name);

    return rows.map((row) => ({ ...row, createdAt: row.createdAt?.toISOString() ?? null }));
  }

  private async requireOwnedTower(societyId: string, towerId: string) {
    const [tower] = await db
      .select()
      .from(towersTable)
      .where(eq(towersTable.id, towerId))
      .limit(1);
    if (!tower || tower.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tower not found" });
    }
    return tower;
  }

  async update(
    societyId: string,
    input: { towerId: string; name?: string; code?: string },
  ): Promise<TowerOutput> {
    await this.requireOwnedTower(societyId, input.towerId);

    const [updated] = await db
      .update(towersTable)
      .set({ ...(input.name && { name: input.name }), ...(input.code !== undefined && { code: input.code }) })
      .where(eq(towersTable.id, input.towerId))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [flatCountRow] = await db
      .select({ flatCount: count() })
      .from(flatsTable)
      .where(eq(flatsTable.towerId, updated.id));

    return { ...updated, flatCount: flatCountRow?.flatCount ?? 0, createdAt: updated.createdAt?.toISOString() ?? null };
  }

  async remove(societyId: string, towerId: string): Promise<void> {
    await this.requireOwnedTower(societyId, towerId);

    const [flatCountRow] = await db
      .select({ flatCount: count() })
      .from(flatsTable)
      .where(eq(flatsTable.towerId, towerId));
    if ((flatCountRow?.flatCount ?? 0) > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "Remove this tower's flats first" });
    }

    await db.delete(towersTable).where(eq(towersTable.id, towerId));
  }
}

export default TowerService;
