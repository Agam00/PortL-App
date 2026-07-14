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

export const createComplaintInputSchema = z.object({
  category: z.string().min(1).max(50),
  title: z.string().min(1).max(150),
  description: z.string().min(1),
  photoBase64: z
    .string()
    .max(500_000)
    .optional()
    .describe("data: URL, e.g. data:image/jpeg;base64,..."),
});

export const complaintIdInputSchema = z.object({
  complaintId: z.string().uuid(),
});

export const addCommentInputSchema = z.object({
  complaintId: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

export const complaintCommentOutputSchema = z.object({
  id: z.string().uuid(),
  complaintId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  authorRole: z.enum(["resident", "guard", "admin"]),
  body: z.string(),
  createdAt: z.string().nullable(),
});
export type ComplaintCommentOutput = z.infer<typeof complaintCommentOutputSchema>;

export const listCommentsOutputSchema = z.array(complaintCommentOutputSchema);
