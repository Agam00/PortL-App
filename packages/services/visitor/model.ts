import { z } from "zod";

export const visitorTypeSchema = z.enum(["guest", "delivery", "cab", "service", "other"]);
export const visitorSourceSchema = z.enum(["guard_initiated", "resident_preapproved"]);
export const visitorStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
  "checked_in",
  "checked_out",
]);

export const createVisitorInputSchema = z.object({
  flatNumber: z.string().min(1).max(20).describe("e.g. \"A-101\" — resolved to a flat within the guard's society"),
  name: z.string().min(1).max(80),
  phone: z.string().max(20).optional(),
  type: visitorTypeSchema,
});

export const decideVisitorInputSchema = z.object({
  visitorId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export const visitorOutputSchema = z.object({
  id: z.string().uuid(),
  flatId: z.string().uuid(),
  flatNumber: z.string().nullable(),
  name: z.string(),
  phone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  type: visitorTypeSchema,
  source: visitorSourceSchema,
  status: visitorStatusSchema,
  requestedByGuardId: z.string().uuid().nullable(),
  decidedByUserId: z.string().uuid().nullable(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
});
export type VisitorOutput = z.infer<typeof visitorOutputSchema>;

export const listVisitorsOutputSchema = z.array(visitorOutputSchema);
