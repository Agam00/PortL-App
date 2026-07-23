import { db, eq, and, isNull } from "@repo/database";
import { usersTable } from "@repo/database/schema";
import type { DutyStatusOutput, GuardDutyOutput } from "./model";

class DutyService {
  /** A guard flips their own on/off duty state. */
  async setStatus(userId: string, onDuty: boolean): Promise<DutyStatusOutput> {
    const now = new Date();
    const [row] = await db
      .update(usersTable)
      .set({ onDuty, dutyChangedAt: now })
      .where(eq(usersTable.id, userId))
      .returning({ onDuty: usersTable.onDuty, dutyChangedAt: usersTable.dutyChangedAt });
    return {
      onDuty: row?.onDuty ?? onDuty,
      dutyChangedAt: (row?.dutyChangedAt ?? now).toISOString(),
    };
  }

  async myStatus(userId: string): Promise<DutyStatusOutput> {
    const [row] = await db
      .select({ onDuty: usersTable.onDuty, dutyChangedAt: usersTable.dutyChangedAt })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    return { onDuty: row?.onDuty ?? false, dutyChangedAt: row?.dutyChangedAt?.toISOString() ?? null };
  }

  /** All guards in a society with their duty state — used by admins and residents. */
  async listGuards(societyId: string): Promise<GuardDutyOutput[]> {
    const rows = await db
      .select({
        id: usersTable.id,
        name: usersTable.fullName,
        onDuty: usersTable.onDuty,
        dutyChangedAt: usersTable.dutyChangedAt,
      })
      .from(usersTable)
      .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "guard"), isNull(usersTable.deletedAt)));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      onDuty: r.onDuty,
      dutyChangedAt: r.dutyChangedAt?.toISOString() ?? null,
    }));
  }
}

export default DutyService;
