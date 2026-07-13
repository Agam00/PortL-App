import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { pollService } from "../../services";
import {
  createPollInputSchema,
  pollIdInputSchema,
  pollOutputSchema,
  listPollsOutputSchema,
} from "@repo/services/poll/model";
import { adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Polls"];
const getPath = generatePath("/polls");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

// Resident-facing list/vote procedures arrive in Phase 7.
export const pollsRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createPollInputSchema)
    .output(pollOutputSchema)
    .mutation(async ({ ctx, input }) => pollService.create(requireSocietyId(ctx.user.societyId), ctx.user.sub, input)),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listPollsOutputSchema)
    .query(async ({ ctx }) => pollService.list(requireSocietyId(ctx.user.societyId))),

  close: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/close"), tags: TAGS } })
    .input(pollIdInputSchema)
    .output(pollOutputSchema)
    .mutation(async ({ ctx, input }) => pollService.close(requireSocietyId(ctx.user.societyId), input.pollId)),

  remove: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(pollIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await pollService.remove(requireSocietyId(ctx.user.societyId), input.pollId);
    }),
});
