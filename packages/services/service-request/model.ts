import { z } from "zod";

export const serviceRequestStatusSchema = z.enum(["requested", "confirmed", "completed", "cancelled"]);

export const createServiceRequestInputSchema = z.object({
  category: z.string().min(1).max(60),
  note: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const serviceRequestIdInputSchema = z.object({
  requestId: z.string().uuid(),
});

export const serviceRequestOutputSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  note: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  status: serviceRequestStatusSchema,
  createdAt: z.string().nullable(),
});
export type ServiceRequestOutput = z.infer<typeof serviceRequestOutputSchema>;

export const listServiceRequestsOutputSchema = z.array(serviceRequestOutputSchema);
