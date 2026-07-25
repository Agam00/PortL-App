import { z } from "zod";

export const dueStatusSchema = z.enum(["pending", "paid", "overdue"]);

// Admin creates a charge: either for one flat, or for every resident's flat.
// NOTE: no .refine() here — trpc-to-openapi calls .omit() on input schemas, which
// Zod forbids on refined objects. The "flat or applyToAll" rule is enforced in the service.
export const createDueInputSchema = z.object({
  title: z.string().max(120).optional(),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  applyToAll: z.boolean().optional(),
  flatId: z.string().uuid().optional(),
});

export const createDueResultSchema = z.object({
  count: z.number().describe("How many due rows were created"),
});

export const dueIdInputSchema = z.object({
  dueId: z.string().uuid(),
});

export const submitUpiPaymentInputSchema = z.object({
  dueId: z.string().uuid(),
  proofImage: z.string().min(1).describe("Payment screenshot as a base64 data URL"),
});

// Society-level UPI collection details (admin writes; residents read to open their UPI app).
export const paymentSettingsOutputSchema = z.object({
  upiId: z.string().nullable(),
  upiName: z.string().nullable(),
});
export type PaymentSettingsOutput = z.infer<typeof paymentSettingsOutputSchema>;

export const setPaymentSettingsInputSchema = z.object({
  upiId: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[\w.\-]+@[\w.\-]+$/, "Enter a valid UPI ID like name@bank"),
  upiName: z.string().trim().max(120).optional(),
});

export const dueProofOutputSchema = z.object({
  proofImage: z.string().nullable(),
});

export const dueOutputSchema = z.object({
  id: z.string().uuid(),
  flatId: z.string().uuid(),
  flatNumber: z.string(),
  towerName: z.string(),
  period: z.string(),
  title: z.string().nullable(),
  amount: z.string(),
  status: dueStatusSchema,
  isOverdue: z.boolean(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  hasProof: z.boolean(),
  verified: z.boolean(),
  createdAt: z.string().nullable(),
});
export type DueOutput = z.infer<typeof dueOutputSchema>;

export const listDuesOutputSchema = z.array(dueOutputSchema);
