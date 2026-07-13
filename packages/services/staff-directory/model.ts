import { z } from "zod";

export const createStaffInputSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().min(1).max(40),
  phone: z.string().min(6).max(20),
  photoUrl: z.string().max(500_000).optional(),
  isVerifiedByAdmin: z.boolean().optional(),
});

export const updateStaffInputSchema = z.object({
  staffId: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  category: z.string().min(1).max(40).optional(),
  phone: z.string().min(6).max(20).optional(),
  photoUrl: z.string().max(500_000).optional(),
  isVerifiedByAdmin: z.boolean().optional(),
});

export const staffIdInputSchema = z.object({
  staffId: z.string().uuid(),
});

export const staffOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  phone: z.string(),
  photoUrl: z.string().nullable(),
  isVerifiedByAdmin: z.boolean(),
  createdAt: z.string().nullable(),
});
export type StaffOutput = z.infer<typeof staffOutputSchema>;

export const listStaffOutputSchema = z.array(staffOutputSchema);
