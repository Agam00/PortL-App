import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { visitorService } from "../../services";
import {
  createVisitorInputSchema,
  decideVisitorInputSchema,
  visitorIdInputSchema,
  preApproveVisitorInputSchema,
  searchPreApprovedInputSchema,
  visitorOutputSchema,
  listVisitorsOutputSchema,
} from "@repo/services/visitor/model";
import { guardProcedure, residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Visitors"];
const getPath = generatePath("/visitors");

function requireFlatId(flatId: string | null): string {
  if (!flatId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No flat assigned to this account" });
  }
  return flatId;
}

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
  }
  return societyId;
}

export const visitorsRouter = router({
  create: guardProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createVisitorInputSchema)
    .output(visitorOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return visitorService.create(requireSocietyId(ctx.user.societyId), ctx.user.sub, input);
    }),

  listPendingForResident: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/pending"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listVisitorsOutputSchema)
    .query(async ({ ctx }) => {
      return visitorService.listPendingForResident(requireFlatId(ctx.user.flatId));
    }),

  decide: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/decide"), tags: TAGS } })
    .input(decideVisitorInputSchema)
    .output(visitorOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return visitorService.decide(ctx.user.sub, requireFlatId(ctx.user.flatId), input);
    }),

  listForGuard: guardProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listVisitorsOutputSchema)
    .query(async ({ ctx }) => {
      return visitorService.listForGuard(requireSocietyId(ctx.user.societyId));
    }),

  markEntry: guardProcedure
    .meta({ openapi: { method: "POST", path: getPath("/mark-entry"), tags: TAGS } })
    .input(visitorIdInputSchema)
    .output(visitorOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return visitorService.markEntry(requireSocietyId(ctx.user.societyId), ctx.user.sub, input.visitorId);
    }),

  markExit: guardProcedure
    .meta({ openapi: { method: "POST", path: getPath("/mark-exit"), tags: TAGS } })
    .input(visitorIdInputSchema)
    .output(visitorOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return visitorService.markExit(requireSocietyId(ctx.user.societyId), ctx.user.sub, input.visitorId);
    }),

  preApprove: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/pre-approve"), tags: TAGS } })
    .input(preApproveVisitorInputSchema)
    .output(visitorOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return visitorService.preApprove(
        requireSocietyId(ctx.user.societyId),
        requireFlatId(ctx.user.flatId),
        ctx.user.sub,
        input,
      );
    }),

  listPreApprovedForResident: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/pre-approved"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listVisitorsOutputSchema)
    .query(async ({ ctx }) => {
      return visitorService.listPreApprovedForResident(requireFlatId(ctx.user.flatId));
    }),

  searchPreApproved: guardProcedure
    .meta({ openapi: { method: "GET", path: getPath("/pre-approved/search"), tags: TAGS } })
    .input(searchPreApprovedInputSchema)
    .output(listVisitorsOutputSchema)
    .query(async ({ ctx, input }) => {
      return visitorService.searchPreApproved(requireSocietyId(ctx.user.societyId), input.query);
    }),
});
