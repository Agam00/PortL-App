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
  flatId: z.string().uuid().describe("Selected via residents.search"),
  name: z.string().min(1).max(80),
  phone: z.string().max(20).optional(),
  type: visitorTypeSchema,
  photoBase64: z
    .string()
    .max(500_000)
    .optional()
    .describe("data: URL, e.g. data:image/jpeg;base64,... — kept small, no file storage infra needed"),
});

export const decideVisitorInputSchema = z.object({
  visitorId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export const visitorIdInputSchema = z.object({
  visitorId: z.string().uuid(),
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
