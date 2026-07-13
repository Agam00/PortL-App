import { TRPCError } from "@trpc/server";
import { db, eq } from "@repo/database";
import { staffDirectoryTable } from "@repo/database/schema";
import type { StaffOutput } from "./model";

function serialize(row: typeof staffDirectoryTable.$inferSelect): StaffOutput {
  return { ...row, createdAt: row.createdAt?.toISOString() ?? null };
}

class StaffDirectoryService {
  async create(
    societyId: string,
    addedByUserId: string,
    input: { name: string; category: string; phone: string; photoUrl?: string; isVerifiedByAdmin?: boolean },
  ): Promise<StaffOutput> {
    const [staff] = await db
      .insert(staffDirectoryTable)
      .values({ societyId, addedByUserId, ...input })
      .returning();
    if (!staff) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(staff);
  }

  async list(societyId: string): Promise<StaffOutput[]> {
    const rows = await db
      .select()
      .from(staffDirectoryTable)
      .where(eq(staffDirectoryTable.societyId, societyId))
      .orderBy(staffDirectoryTable.category, staffDirectoryTable.name);
    return rows.map(serialize);
  }

  private async requireOwned(societyId: string, staffId: string) {
    const [staff] = await db.select().from(staffDirectoryTable).where(eq(staffDirectoryTable.id, staffId)).limit(1);
    if (!staff || staff.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Staff entry not found" });
    }
    return staff;
  }

  async update(
    societyId: string,
    input: { staffId: string; name?: string; category?: string; phone?: string; photoUrl?: string; isVerifiedByAdmin?: boolean },
  ): Promise<StaffOutput> {
    await this.requireOwned(societyId, input.staffId);
    const { staffId, ...patch } = input;

    const [updated] = await db
      .update(staffDirectoryTable)
      .set(patch)
      .where(eq(staffDirectoryTable.id, staffId))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(updated);
  }

  async remove(societyId: string, staffId: string): Promise<void> {
    await this.requireOwned(societyId, staffId);
    await db.delete(staffDirectoryTable).where(eq(staffDirectoryTable.id, staffId));
  }
}

export default StaffDirectoryService;
