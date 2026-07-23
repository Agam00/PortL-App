import { z } from "zod";

export const dutyStatusOutputSchema = z.object({
  onDuty: z.boolean(),
  dutyChangedAt: z.string().nullable(),
});
export type DutyStatusOutput = z.infer<typeof dutyStatusOutputSchema>;

export const setDutyInputSchema = z.object({
  onDuty: z.boolean(),
});

export const guardDutyOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  onDuty: z.boolean(),
  dutyChangedAt: z.string().nullable(),
});
export type GuardDutyOutput = z.infer<typeof guardDutyOutputSchema>;

export const listGuardDutyOutputSchema = z.array(guardDutyOutputSchema);
