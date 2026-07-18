import { TRPCError } from "@trpc/server";
import { db, eq, and, desc } from "@repo/database";
import { serviceRequestsTable } from "@repo/database/schema";
import type { ServiceRequestOutput } from "./model";

type Row = typeof serviceRequestsTable.$inferSelect;

function serialize(row: Row): ServiceRequestOutput {
  return {
    id: row.id,
    category: row.category,
    note: row.note ?? null,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    status: row.status,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

class ServiceRequestService {
  async create(
    societyId: string,
    residentId: string,
    input: { category: string; note?: string; scheduledAt?: string },
  ): Promise<ServiceRequestOutput> {
    const [row] = await db
      .insert(serviceRequestsTable)
      .values({
        societyId,
        residentId,
        category: input.category,
        note: input.note,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      })
      .returning();
    if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(row);
  }

  async mine(residentId: string): Promise<ServiceRequestOutput[]> {
    const rows = await db
      .select()
      .from(serviceRequestsTable)
      .where(eq(serviceRequestsTable.residentId, residentId))
      .orderBy(desc(serviceRequestsTable.createdAt));
    return rows.map(serialize);
  }

  async cancel(residentId: string, requestId: string): Promise<ServiceRequestOutput> {
    const [existing] = await db
      .select()
      .from(serviceRequestsTable)
      .where(and(eq(serviceRequestsTable.id, requestId), eq(serviceRequestsTable.residentId, residentId)))
      .limit(1);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

    const [updated] = await db
      .update(serviceRequestsTable)
      .set({ status: "cancelled" })
      .where(eq(serviceRequestsTable.id, requestId))
      .returning();
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return serialize(updated);
  }
}

export default ServiceRequestService;
