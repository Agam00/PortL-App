import { TRPCError } from "@trpc/server";
import { z, zodUndefinedModel } from "../../schema";
import { userService, authService } from "../../services";
import { getAuthenticationMethodOutputSchema } from "@repo/services/user/model";
import {
  loginInputSchema,
  authTokensOutputSchema,
  refreshInputSchema,
  refreshOutputSchema,
  logoutInputSchema,
  authUserSchema,
  setPasswordInputSchema,
  lookupInviteInputSchema,
  lookupInviteOutputSchema,
  claimAccountInputSchema,
  registerAdminInputSchema,
} from "@repo/services/auth/model";
import { publicProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Authentication"];
const getPath = generatePath("/authentication");

export const authRouter = router({
  getSupportedAuthenticationProviders: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/supported-providers"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.readonly(z.array(getAuthenticationMethodOutputSchema)))
    .query(async () => {
      const supportedMethods = await userService.getAuthenticationMethods();
      return supportedMethods;
    }),

  login: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/login"), tags: TAGS } })
    .input(loginInputSchema)
    .output(authTokensOutputSchema)
    .mutation(async ({ input }) => {
      return authService.login(input.identifier, input.password);
    }),

  register: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/register"), tags: TAGS } })
    .input(registerAdminInputSchema)
    .output(authTokensOutputSchema)
    .mutation(async ({ input }) => authService.registerAdmin(input)),

  lookupInvite: publicProcedure
    .meta({ openapi: { method: "GET", path: getPath("/invite"), tags: TAGS } })
    .input(lookupInviteInputSchema)
    .output(lookupInviteOutputSchema)
    .query(async ({ input }) => authService.lookupInvite(input.code)),

  claimAccount: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/claim"), tags: TAGS } })
    .input(claimAccountInputSchema)
    .output(authTokensOutputSchema)
    .mutation(async ({ input }) => authService.claimAccount(input.code, input.password)),

  refresh: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/refresh"), tags: TAGS } })
    .input(refreshInputSchema)
    .output(refreshOutputSchema)
    .mutation(async ({ input }) => {
      return authService.refresh(input.refreshToken);
    }),

  logout: publicProcedure
    .meta({ openapi: { method: "POST", path: getPath("/logout"), tags: TAGS } })
    .input(logoutInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ input }) => {
      await authService.logout(input.refreshToken);
      return { success: true as const };
    }),

  me: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(authUserSchema)
    .query(async ({ ctx }) => {
      const user = await authService.getById(ctx.user.sub);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return user;
    }),

  setPassword: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/set-password"), tags: TAGS } })
    .input(setPasswordInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await authService.setPassword(ctx.user.sub, input.newPassword);
      return { success: true as const };
    }),

  deleteAccount: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete-account"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      await userService.deleteSelf(ctx.user.sub);
      return { success: true as const };
    }),
});
