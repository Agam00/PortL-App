import { TRPCError } from "@trpc/server";
import { z, zodUndefinedModel } from "../../schema";
import { userService, adminService } from "../../services";
import {
  inviteResidentInputSchema,
  inviteGuardInputSchema,
  inviteUserOutputSchema,
  deactivateUserInputSchema,
  reassignResidentFlatInputSchema,
  listAdminUsersOutputSchema,
} from "@repo/services/user/model";
import { adminMetricsOutputSchema } from "@repo/services/admin/model";
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

  activateUser: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/users/activate"), tags: TAGS } })
    .input(deactivateUserInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ input }) => {
      await userService.activateUser(input.userId);
      return { success: true as const };
    }),

  listResidents: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/residents"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listAdminUsersOutputSchema)
    .query(async ({ ctx }) => userService.listResidents(requireSocietyId(ctx.user.societyId))),

  listGuards: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/guards"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listAdminUsersOutputSchema)
    .query(async ({ ctx }) => userService.listGuards(requireSocietyId(ctx.user.societyId))),

  reassignResidentFlat: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/residents/reassign-flat"), tags: TAGS } })
    .input(reassignResidentFlatInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await userService.reassignResidentFlat(requireSocietyId(ctx.user.societyId), input.userId, input.flatId);
    }),

  metrics: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/metrics"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(adminMetricsOutputSchema)
    .query(async ({ ctx }) => adminService.getMetrics(requireSocietyId(ctx.user.societyId))),
});
