import { z } from "zod";

export const reportInputSchema = z.object({
  targetType: z.enum(["post", "comment", "message", "user"]),
  targetId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const blockUserInputSchema = z.object({ userId: z.string().uuid() });

export const blockedUserSchema = z.object({ id: z.string().uuid(), fullName: z.string() });
export const blockedUsersOutputSchema = z.array(blockedUserSchema);
export type BlockedUser = z.infer<typeof blockedUserSchema>;
