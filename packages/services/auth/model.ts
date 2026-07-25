import { z } from "zod";

export const userRoleSchema = z.enum(["resident", "guard", "admin"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: userRoleSchema,
  societyId: z.string().uuid().nullable(),
  flatId: z.string().uuid().nullable(),
});
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  role: userRoleSchema,
  societyId: z.string().uuid().nullable(),
  flatId: z.string().uuid().nullable(),
  flatNumber: z.string().nullable(),
  towerName: z.string().nullable(),
  mustResetPassword: z.boolean(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const loginInputSchema = z.object({
  identifier: z.string().min(3).describe("Phone number or email"),
  password: z.string().min(6),
});

export const authTokensOutputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
});

export const refreshInputSchema = z.object({
  refreshToken: z.string(),
});

export const refreshOutputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const logoutInputSchema = z.object({
  refreshToken: z.string(),
});

export const setPasswordInputSchema = z.object({
  newPassword: z.string().min(6),
});

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(8)
  .max(12)
  .describe("Invite code from the admin, typed in or scanned off the QR");

export const lookupInviteInputSchema = z.object({
  code: inviteCodeSchema,
});

export const lookupInviteOutputSchema = z.object({
  fullName: z.string(),
  role: userRoleSchema,
  phone: z.string(),
  societyName: z.string().nullable(),
  flatNumber: z.string().nullable(),
});

export const claimAccountInputSchema = z.object({
  code: inviteCodeSchema,
  password: z.string().min(6),
});

// Public society onboarding: creates a new society and its first admin account.
export const registerAdminInputSchema = z.object({
  societyName: z.string().trim().min(2).max(120),
  fullName: z.string().trim().min(1).max(80),
  email: z.string().email(),
  phone: z.string().trim().min(6).max(20),
  password: z.string().min(6),
});
