import { TRPCError } from "@trpc/server";
import { z } from "../../schema";
import { userService } from "../../services";
import {
  inviteResidentInputSchema,
  inviteGuardInputSchema,
  inviteUserOutputSchema,
  deactivateUserInputSchema,
} from "@repo/services/user/model";
import { adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Admin"];
const getPath = generatePath("/admin");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

export const adminRouter = router({
  inviteResident: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/residents/invite"), tags: TAGS } })
    .input(inviteResidentInputSchema)
    .output(inviteUserOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return userService.inviteResident(requireSocietyId(ctx.user.societyId), input);
    }),

  inviteGuard: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/guards/invite"), tags: TAGS } })
    .input(inviteGuardInputSchema)
    .output(inviteUserOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return userService.inviteGuard(requireSocietyId(ctx.user.societyId), input);
    }),

  deactivateUser: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/users/deactivate"), tags: TAGS } })
    .input(deactivateUserInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ input }) => {
      await userService.deactivateUser(input.userId);
      return { success: true as const };
    }),
});
