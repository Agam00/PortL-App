import { TRPCError } from "@trpc/server";
import { db, eq, and, count } from "@repo/database";
import { amenityBookingsTable, amenitiesTable, flatsTable, usersTable } from "@repo/database/schema";
import type { BookingOutput } from "./model";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function buildSlotGrid(openTime: string, closeTime: string, slotMinutes: number): string[] {
  const slots: string[] = [];
  const start = toMinutes(openTime);
  const end = toMinutes(closeTime);
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
    slots.push(toTimeString(t));
  }
  return slots;
}

async function requireActiveAmenity(societyId: string, amenityId: string) {
  const [amenity] = await db.select().from(amenitiesTable).where(eq(amenitiesTable.id, amenityId)).limit(1);
  if (!amenity || amenity.societyId !== societyId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Facility not found" });
  }
  if (!amenity.isActive) {
    throw new TRPCError({ code: "CONFLICT", message: "This facility isn't currently bookable" });
  }
  return amenity;
}

function enrichRow(row: {
  id: string;
  amenityId: string;
  amenityName: string;
  flatId: string;
  flatNumber: string;
  bookedByUserId: string;
  bookedByName: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  status: "confirmed" | "cancelled";
  createdAt: Date | null;
}): BookingOutput {
  return { ...row, createdAt: row.createdAt?.toISOString() ?? null };
}

class AmenityBookingService {
  async availableSlots(societyId: string, amenityId: string, date: string) {
    const amenity = await requireActiveAmenity(societyId, amenityId);
    const grid = buildSlotGrid(amenity.openTime, amenity.closeTime, amenity.slotMinutes);

    const bookings = await db
      .select({ slotStart: amenityBookingsTable.slotStart })
      .from(amenityBookingsTable)
      .where(
        and(
          eq(amenityBookingsTable.amenityId, amenityId),
          eq(amenityBookingsTable.date, date),
          eq(amenityBookingsTable.status, "confirmed"),
        ),
      );

    const bookedCounts = new Map<string, number>();
    for (const booking of bookings) {
      const key = booking.slotStart.slice(0, 5);
      bookedCounts.set(key, (bookedCounts.get(key) ?? 0) + 1);
    }

    return grid.map((slotStart) => {
      const bookedCount = bookedCounts.get(slotStart) ?? 0;
      return {
        slotStart,
        slotEnd: toTimeString(toMinutes(slotStart) + amenity.slotMinutes),
        bookedCount,
        capacity: amenity.capacity,
        isAvailable: bookedCount < amenity.capacity,
      };
    });
  }

  async create(
    societyId: string,
    flatId: string,
    userId: string,
    input: { amenityId: string; date: string; slotStart: string },
  ): Promise<BookingOutput> {
    const amenity = await requireActiveAmenity(societyId, input.amenityId);
    const grid = buildSlotGrid(amenity.openTime, amenity.closeTime, amenity.slotMinutes);
    if (!grid.includes(input.slotStart)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "That time slot isn't offered for this facility" });
    }

    const [bookedCountRow] = await db
      .select({ bookedCount: count() })
      .from(amenityBookingsTable)
      .where(
        and(
          eq(amenityBookingsTable.amenityId, input.amenityId),
          eq(amenityBookingsTable.date, input.date),
          eq(amenityBookingsTable.slotStart, input.slotStart),
          eq(amenityBookingsTable.status, "confirmed"),
        ),
      );
    if ((bookedCountRow?.bookedCount ?? 0) >= amenity.capacity) {
      throw new TRPCError({ code: "CONFLICT", message: "This slot is fully booked" });
    }

    const slotEnd = toTimeString(toMinutes(input.slotStart) + amenity.slotMinutes);
    const [booking] = await db
      .insert(amenityBookingsTable)
      .values({
        amenityId: input.amenityId,
        flatId,
        bookedByUserId: userId,
        date: input.date,
        slotStart: input.slotStart,
        slotEnd,
      })
      .returning();
    if (!booking) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const enriched = await this.getById(booking.id);
    if (!enriched) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return enriched;
  }

  private baseQuery() {
    return db
      .select({
        id: amenityBookingsTable.id,
        amenityId: amenityBookingsTable.amenityId,
        amenityName: amenitiesTable.name,
        flatId: amenityBookingsTable.flatId,
        flatNumber: flatsTable.flatNumber,
        bookedByUserId: amenityBookingsTable.bookedByUserId,
        bookedByName: usersTable.fullName,
        date: amenityBookingsTable.date,
        slotStart: amenityBookingsTable.slotStart,
        slotEnd: amenityBookingsTable.slotEnd,
        status: amenityBookingsTable.status,
        createdAt: amenityBookingsTable.createdAt,
      })
      .from(amenityBookingsTable)
      .innerJoin(amenitiesTable, eq(amenitiesTable.id, amenityBookingsTable.amenityId))
      .innerJoin(flatsTable, eq(flatsTable.id, amenityBookingsTable.flatId))
      .innerJoin(usersTable, eq(usersTable.id, amenityBookingsTable.bookedByUserId));
  }

  async getById(bookingId: string): Promise<BookingOutput | null> {
    const [row] = await this.baseQuery().where(eq(amenityBookingsTable.id, bookingId)).limit(1);
    return row ? enrichRow(row) : null;
  }

  async myBookings(flatId: string): Promise<BookingOutput[]> {
    const rows = await this.baseQuery().where(eq(amenityBookingsTable.flatId, flatId)).orderBy(amenityBookingsTable.date);
    return rows.reverse().map(enrichRow);
  }

  async cancel(flatId: string, bookingId: string): Promise<void> {
    const [booking] = await db.select().from(amenityBookingsTable).where(eq(amenityBookingsTable.id, bookingId)).limit(1);
    if (!booking || booking.flatId !== flatId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
    }
    if (booking.status === "cancelled") {
      throw new TRPCError({ code: "CONFLICT", message: "This booking is already cancelled" });
    }
    await db.update(amenityBookingsTable).set({ status: "cancelled" }).where(eq(amenityBookingsTable.id, bookingId));
  }

  async listForAdmin(societyId: string, amenityId?: string, date?: string): Promise<BookingOutput[]> {
    const conditions = [eq(amenitiesTable.societyId, societyId)];
    if (amenityId) conditions.push(eq(amenityBookingsTable.amenityId, amenityId));
    if (date) conditions.push(eq(amenityBookingsTable.date, date));

    const rows = await this.baseQuery()
      .where(and(...conditions))
      .orderBy(amenityBookingsTable.date);
    return rows.reverse().map(enrichRow);
  }
}

export default AmenityBookingService;
