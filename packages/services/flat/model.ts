import { z } from "zod";

export const createFlatInputSchema = z.object({
  towerId: z.string().uuid(),
  flatNumber: z.string().min(1).max(20),
  floor: z.number().int().optional(),
  type: z.string().max(20).optional(),
});

export const updateFlatInputSchema = z.object({
  flatId: z.string().uuid(),
  flatNumber: z.string().min(1).max(20).optional(),
  floor: z.number().int().optional(),
  type: z.string().max(20).optional(),
});

export const flatIdInputSchema = z.object({
  flatId: z.string().uuid(),
});

export const listFlatsInputSchema = z.object({
  towerId: z.string().uuid().optional(),
});

export const flatOutputSchema = z.object({
  id: z.string().uuid(),
  towerId: z.string().uuid(),
  towerName: z.string(),
  flatNumber: z.string(),
  floor: z.number().nullable(),
  type: z.string().nullable(),
  residentCount: z.number(),
  createdAt: z.string().nullable(),
});
export type FlatOutput = z.infer<typeof flatOutputSchema>;

export const listFlatsOutputSchema = z.array(flatOutputSchema);
