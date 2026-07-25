import { z } from "zod";

export const vehicleTypeSchema = z.enum(["car", "bike", "other"]);

export const createVehicleInputSchema = z.object({
  type: vehicleTypeSchema,
  number: z
    .string()
    .trim()
    .min(2, "Enter the vehicle number")
    .max(20),
});

export const vehicleIdInputSchema = z.object({
  vehicleId: z.string().uuid(),
});

export const vehicleOutputSchema = z.object({
  id: z.string().uuid(),
  type: vehicleTypeSchema,
  number: z.string(),
  createdAt: z.string().nullable(),
});
export type VehicleOutput = z.infer<typeof vehicleOutputSchema>;

export const listVehiclesOutputSchema = z.array(vehicleOutputSchema);
