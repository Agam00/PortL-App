import { TRPCError } from "@trpc/server";
import { db, eq } from "@repo/database";
import { amenitiesTable } from "@repo/database/schema";
import type { AmenityOutput } from "./model";

function serialize(row: typeof amenitiesTable.$inferSelect): AmenityOutput {
  return { ...row, createdAt: row.createdAt?.toISOString() ?? null };
}

class AmenityService {
  async create(
    societyId: string,
    input: {
      name: string;
      description?: string;
      imageUrl?: string;
      capacity: number;
      openTime: string;
      closeTime: string;
      slotMinutes: number;
      isActive?: boolean;
    },
  ): Promise<AmenityOutput> {
    const [amenity] = await db
      .insert(amenitiesTable)
      .values({ societyId, ...input })
      .returning();
    if (!amenity) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(amenity);
  }

  async list(societyId: string): Promise<AmenityOutput[]> {
    const rows = await db
      .select()
      .from(amenitiesTable)
      .where(eq(amenitiesTable.societyId, societyId))
      .orderBy(amenitiesTable.name);
    return rows.map(serialize);
  }

  private async requireOwned(societyId: string, amenityId: string) {
    const [amenity] = await db.select().from(amenitiesTable).where(eq(amenitiesTable.id, amenityId)).limit(1);
    if (!amenity || amenity.societyId !== societyId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Amenity not found" });
    }
    return amenity;
  }

  async update(
    societyId: string,
    input: {
      amenityId: string;
      name?: string;
      description?: string;
      imageUrl?: string;
      capacity?: number;
      openTime?: string;
      closeTime?: string;
      slotMinutes?: number;
      isActive?: boolean;
    },
  ): Promise<AmenityOutput> {
    await this.requireOwned(societyId, input.amenityId);
    const { amenityId, ...patch } = input;

    const [updated] = await db
      .update(amenitiesTable)
      .set(patch)
      .where(eq(amenitiesTable.id, amenityId))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(updated);
  }

  async remove(societyId: string, amenityId: string): Promise<void> {
    await this.requireOwned(societyId, amenityId);
    await db.delete(amenitiesTable).where(eq(amenitiesTable.id, amenityId));
  }
}

export default AmenityService;
