import { z } from "zod";

export const createTowerInputSchema = z.object({
  name: z.string().min(1).max(40),
  code: z.string().max(10).optional(),
});

export const updateTowerInputSchema = z.object({
  towerId: z.string().uuid(),
  name: z.string().min(1).max(40).optional(),
  code: z.string().max(10).optional(),
});

export const towerIdInputSchema = z.object({
  towerId: z.string().uuid(),
});

export const towerOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  flatCount: z.number(),
  createdAt: z.string().nullable(),
});
export type TowerOutput = z.infer<typeof towerOutputSchema>;

export const listTowersOutputSchema = z.array(towerOutputSchema);
