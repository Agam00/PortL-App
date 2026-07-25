import { TRPCError } from "@trpc/server";
import { db, eq, desc } from "@repo/database";
import { vehiclesTable } from "@repo/database/schema";
import type { VehicleOutput } from "./model";

function serialize(row: typeof vehiclesTable.$inferSelect): VehicleOutput {
  return {
    id: row.id,
    type: row.type,
    number: row.number,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

class VehicleService {
  async listMine(userId: string): Promise<VehicleOutput[]> {
    const rows = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId))
      .orderBy(desc(vehiclesTable.createdAt));
    return rows.map(serialize);
  }

  async create(
    userId: string,
    societyId: string | null,
    input: { type: "car" | "bike" | "other"; number: string },
  ): Promise<VehicleOutput> {
    const number = input.number.trim().toUpperCase();
    const [row] = await db
      .insert(vehiclesTable)
      .values({ userId, societyId: societyId ?? null, type: input.type, number })
      .returning();
    if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(row);
  }

  async delete(userId: string, vehicleId: string): Promise<void> {
    const [row] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, vehicleId)).limit(1);
    if (!row || row.userId !== userId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Vehicle not found" });
    }
    await db.delete(vehiclesTable).where(eq(vehiclesTable.id, vehicleId));
  }
}

export default VehicleService;
