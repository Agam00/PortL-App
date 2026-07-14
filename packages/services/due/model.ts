import { z } from "zod";

export const dueStatusSchema = z.enum(["pending", "paid", "overdue"]);

export const createDueInputSchema = z.object({
  flatId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format"),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
});

export const dueIdInputSchema = z.object({
  dueId: z.string().uuid(),
});

export const dueOutputSchema = z.object({
  id: z.string().uuid(),
  flatId: z.string().uuid(),
  flatNumber: z.string(),
  towerName: z.string(),
  period: z.string(),
  amount: z.string(),
  status: dueStatusSchema,
  isOverdue: z.boolean(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type DueOutput = z.infer<typeof dueOutputSchema>;

export const listDuesOutputSchema = z.array(dueOutputSchema);
