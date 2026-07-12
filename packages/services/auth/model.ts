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
