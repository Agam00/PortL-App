import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { staffDirectoryService } from "../../services";
import {
  createStaffInputSchema,
  updateStaffInputSchema,
  staffIdInputSchema,
  staffOutputSchema,
  listStaffOutputSchema,
} from "@repo/services/staff-directory/model";
import { adminProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["StaffDirectory"];
const getPath = generatePath("/staff-directory");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

export const staffDirectoryRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createStaffInputSchema)
    .output(staffOutputSchema)
    .mutation(async ({ ctx, input }) => staffDirectoryService.create(requireSocietyId(ctx.user.societyId), ctx.user.sub, input)),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listStaffOutputSchema)
    .query(async ({ ctx }) => staffDirectoryService.list(requireSocietyId(ctx.user.societyId))),

  update: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/update"), tags: TAGS } })
    .input(updateStaffInputSchema)
    .output(staffOutputSchema)
    .mutation(async ({ ctx, input }) => staffDirectoryService.update(requireSocietyId(ctx.user.societyId), input)),

  remove: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(staffIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await staffDirectoryService.remove(requireSocietyId(ctx.user.societyId), input.staffId);
    }),

  listForResident: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listStaffOutputSchema)
    .query(async ({ ctx }) => staffDirectoryService.list(requireSocietyId(ctx.user.societyId))),
});
