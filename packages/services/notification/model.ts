import { z } from "zod";

export const notificationOutputSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).nullable(),
  readAt: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type NotificationOutput = z.infer<typeof notificationOutputSchema>;

export const listNotificationsOutputSchema = z.array(notificationOutputSchema);
