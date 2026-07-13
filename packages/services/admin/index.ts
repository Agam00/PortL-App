import { db, eq, and, count, countDistinct, isNotNull, inArray, gte } from "@repo/database";
import {
  flatsTable,
  towersTable,
  usersTable,
  complaintsTable,
  duesTable,
  visitorsTable,
  amenityBookingsTable,
  amenitiesTable,
} from "@repo/database/schema";
import type { AdminMetrics } from "./model";

class AdminService {
  async getMetrics(societyId: string): Promise<AdminMetrics> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayStr = startOfDay.toISOString().slice(0, 10);

    const [
      [totalFlatsRow],
      [occupiedFlatsRow],
      [openComplaintsRow],
      [pendingDuesRow],
      [todayVisitorsRow],
      [upcomingBookingsRow],
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(flatsTable)
        .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
        .where(eq(towersTable.societyId, societyId)),
      db
        .select({ count: countDistinct(usersTable.flatId) })
        .from(usersTable)
        .where(and(eq(usersTable.societyId, societyId), eq(usersTable.role, "resident"), isNotNull(usersTable.flatId))),
      db
        .select({ count: count() })
        .from(complaintsTable)
        .where(and(eq(complaintsTable.societyId, societyId), inArray(complaintsTable.status, ["open", "in_progress"]))),
      db
        .select({ count: count() })
        .from(duesTable)
        .innerJoin(flatsTable, eq(duesTable.flatId, flatsTable.id))
        .innerJoin(towersTable, eq(flatsTable.towerId, towersTable.id))
        .where(and(eq(towersTable.societyId, societyId), eq(duesTable.status, "pending"))),
      db
        .select({ count: count() })
        .from(visitorsTable)
        .where(and(eq(visitorsTable.societyId, societyId), gte(visitorsTable.createdAt, startOfDay))),
      db
        .select({ count: count() })
        .from(amenityBookingsTable)
        .innerJoin(amenitiesTable, eq(amenityBookingsTable.amenityId, amenitiesTable.id))
        .where(
          and(
            eq(amenitiesTable.societyId, societyId),
            eq(amenityBookingsTable.status, "confirmed"),
            gte(amenityBookingsTable.date, todayStr),
          ),
        ),
    ]);

    return {
      totalFlats: totalFlatsRow?.count ?? 0,
      occupiedFlats: occupiedFlatsRow?.count ?? 0,
      openComplaints: openComplaintsRow?.count ?? 0,
      pendingDues: pendingDuesRow?.count ?? 0,
      todayVisitorCount: todayVisitorsRow?.count ?? 0,
      upcomingAmenityBookings: upcomingBookingsRow?.count ?? 0,
    };
  }
}

export default AdminService;
