import { z } from "zod";

export const registerPushTokenInputSchema = z.object({
  expoPushToken: z.string().min(1),
  deviceInfo: z.string().max(200).optional(),
});
