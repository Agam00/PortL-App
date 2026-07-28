import { zodUndefinedModel } from "../../schema";
import { moderationService } from "../../services";
import { reportInputSchema, blockUserInputSchema, blockedUsersOutputSchema } from "@repo/services/moderation/model";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Moderation"];
const getPath = generatePath("/moderation");

export const moderationRouter = router({
  report: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/report"), tags: TAGS } })
    .input(reportInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await moderationService.report(ctx.user.sub, ctx.user.societyId, input);
    }),

  block: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/block"), tags: TAGS } })
    .input(blockUserInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await moderationService.block(ctx.user.sub, input.userId);
    }),

  unblock: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/unblock"), tags: TAGS } })
    .input(blockUserInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await moderationService.unblock(ctx.user.sub, input.userId);
    }),

  listBlocked: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/blocked"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(blockedUsersOutputSchema)
    .query(async ({ ctx }) => moderationService.listBlocked(ctx.user.sub)),
});
