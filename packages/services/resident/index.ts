import { db, eq, and, or, ilike, inArray, isNull } from "@repo/database";
import { flatsTable, towersTable, usersTable } from "@repo/database/schema";
import type { FlatSearchResult, SocietyContact } from "./model";

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

  /** Full society directory — every occupied flat with its residents, ordered by flat number. */
  async directory(societyId: string): Promise<FlatSearchResult[]> {
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
      .innerJoin(usersTable, and(eq(usersTable.flatId, flatsTable.id), eq(usersTable.role, "resident")))
      .where(eq(towersTable.societyId, societyId))
      .orderBy(flatsTable.flatNumber);

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

    return Array.from(byFlat.values());
  }

  /** Society staff (guards + admin) a resident can reach — call or chat. */
  async societyContacts(societyId: string): Promise<SocietyContact[]> {
    const rows = await db
      .select({ id: usersTable.id, fullName: usersTable.fullName, phone: usersTable.phone, role: usersTable.role })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.societyId, societyId),
          inArray(usersTable.role, ["guard", "admin"]),
          eq(usersTable.isActive, true),
          isNull(usersTable.deletedAt),
        ),
      )
      .orderBy(usersTable.role, usersTable.fullName);

    return rows.map((r) => ({ id: r.id, fullName: r.fullName, phone: r.phone, role: r.role as "guard" | "admin" }));
  }
}

export default ResidentService;
