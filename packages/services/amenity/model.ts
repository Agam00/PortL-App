import { z } from "zod";

const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM format");

export const createAmenityInputSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  imageUrl: z.string().max(500_000).optional(),
  capacity: z.number().int().min(1),
  openTime: timeSchema,
  closeTime: timeSchema,
  slotMinutes: z.number().int().min(15),
  isActive: z.boolean().optional(),
});

export const updateAmenityInputSchema = z.object({
  amenityId: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  imageUrl: z.string().max(500_000).optional(),
  capacity: z.number().int().min(1).optional(),
  openTime: timeSchema.optional(),
  closeTime: timeSchema.optional(),
  slotMinutes: z.number().int().min(15).optional(),
  isActive: z.boolean().optional(),
});

export const amenityIdInputSchema = z.object({
  amenityId: z.string().uuid(),
});

export const amenityOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  capacity: z.number(),
  openTime: z.string(),
  closeTime: z.string(),
  slotMinutes: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().nullable(),
});
export type AmenityOutput = z.infer<typeof amenityOutputSchema>;

export const listAmenitiesOutputSchema = z.array(amenityOutputSchema);
