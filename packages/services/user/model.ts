import { z } from "zod";
import { userRoleSchema } from "../auth/model";

export const getAuthenticationMethodOutputSchema = z.object({
  provider: z.enum(["GOOGLE_OAUTH"]),
  displayName: z.string().optional(),
  displayText: z.string().optional(),
  authUrl: z.string(),
});
export type GetAuthenticationMethodOutputSchema = z.infer<
  typeof getAuthenticationMethodOutputSchema
>;

export const inviteResidentInputSchema = z.object({
  fullName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().min(6).max(20),
  flatId: z.string().uuid(),
});

export const inviteGuardInputSchema = z.object({
  fullName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().min(6).max(20),
});

export const inviteUserOutputSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    fullName: z.string(),
    email: z.string(),
    phone: z.string(),
    role: userRoleSchema,
  }),
  inviteCode: z
    .string()
    .describe("Show as a QR or read out to the invitee; they redeem it to set their own password."),
});

export const deactivateUserInputSchema = z.object({
  userId: z.string().uuid(),
});

export const deleteUserInputSchema = z.object({
  userId: z.string().uuid(),
});

export const reassignResidentFlatInputSchema = z.object({
  userId: z.string().uuid(),
  flatId: z.string().uuid(),
});

export const adminUserOutputSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  role: userRoleSchema,
  isActive: z.boolean(),
  flatId: z.string().uuid().nullable(),
  flatNumber: z.string().nullable(),
  towerName: z.string().nullable(),
  mustResetPassword: z.boolean(),
  inviteCode: z.string().nullable().describe("Non-null while the account is still unclaimed."),
  createdAt: z.string().nullable(),
});
export type AdminUserOutput = z.infer<typeof adminUserOutputSchema>;

export const listAdminUsersOutputSchema = z.array(adminUserOutputSchema);
