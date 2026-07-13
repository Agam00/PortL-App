import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { visitorService } from "../../services";
import {
  createVisitorInputSchema,
  decideVisitorInputSchema,
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
      return visitorService.listForGuard(ctx.user.sub);
    }),
});
