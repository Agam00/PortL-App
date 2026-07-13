import { db, eq, and, or, ilike } from "@repo/database";
import { flatsTable, towersTable, usersTable } from "@repo/database/schema";
import type { FlatSearchResult } from "./model";

class ResidentService {
  async search(societyId: string, query: string): Promise<FlatSearchResult[]> {
    const like = `%${query}%`;

    const rows = await db
      .select({
        flatId: flatsTable.id,
        flatNumber: flatsTable.flatNumber,
        towerName: towersTable.name,
        residentId: usersTable.id,
        residentName: usersTable.fullName,
        residentPhone: usersTable.phone,
      })
      .from(flatsTable)
      .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
      .leftJoin(
        usersTable,
        and(eq(usersTable.flatId, flatsTable.id), eq(usersTable.role, "resident")),
      )
      .where(
        and(
          eq(towersTable.societyId, societyId),
          or(
            ilike(flatsTable.flatNumber, like),
            ilike(usersTable.fullName, like),
            ilike(usersTable.phone, like),
          ),
        ),
      )
      .limit(30);

    const byFlat = new Map<string, FlatSearchResult>();
    for (const row of rows) {
      let entry = byFlat.get(row.flatId);
      if (!entry) {
        entry = { flatId: row.flatId, flatNumber: row.flatNumber, towerName: row.towerName, residents: [] };
        byFlat.set(row.flatId, entry);
      }
      if (row.residentId && row.residentName && row.residentPhone) {
        entry.residents.push({ id: row.residentId, fullName: row.residentName, phone: row.residentPhone });
      }
    }

    return Array.from(byFlat.values()).slice(0, 10);
  }
}

export default ResidentService;
