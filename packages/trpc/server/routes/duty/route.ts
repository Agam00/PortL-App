import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { dutyService } from "../../services";
import { setDutyInputSchema, dutyStatusOutputSchema, listGuardDutyOutputSchema } from "@repo/services/duty/model";
import { guardProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Duty"];
const getPath = generatePath("/duty");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
  }
  return societyId;
}

export const dutyRouter = router({
  myStatus: guardProcedure
    .meta({ openapi: { method: "GET", path: getPath("/me"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(dutyStatusOutputSchema)
    .query(async ({ ctx }) => dutyService.myStatus(ctx.user.sub)),

  setStatus: guardProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(setDutyInputSchema)
    .output(dutyStatusOutputSchema)
    .mutation(async ({ ctx, input }) => dutyService.setStatus(ctx.user.sub, input.onDuty)),

  // Any logged-in member of the society can see the guard roster's duty state.
  guards: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/guards"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listGuardDutyOutputSchema)
    .query(async ({ ctx }) => dutyService.listGuards(requireSocietyId(ctx.user.societyId))),
});
