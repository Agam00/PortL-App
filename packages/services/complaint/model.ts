import { z } from "zod";

export const complaintStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);
export const complaintPrioritySchema = z.enum(["low", "medium", "high"]);

export const listComplaintsInputSchema = z.object({
  status: complaintStatusSchema.optional(),
});

export const updateComplaintInputSchema = z.object({
  complaintId: z.string().uuid(),
  status: complaintStatusSchema.optional(),
  priority: complaintPrioritySchema.optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
});

export const complaintOutputSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  photoUrl: z.string().nullable(),
  status: complaintStatusSchema,
  priority: complaintPrioritySchema,
  raisedByUserId: z.string().uuid(),
  raisedByName: z.string(),
  flatNumber: z.string().nullable(),
  assignedToUserId: z.string().uuid().nullable(),
  assignedToName: z.string().nullable(),
  createdAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
});
export type ComplaintOutput = z.infer<typeof complaintOutputSchema>;

export const listComplaintsOutputSchema = z.array(complaintOutputSchema);
