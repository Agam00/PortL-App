import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { dueService } from "../../services";
import {
  createDueInputSchema,
  dueIdInputSchema,
  dueOutputSchema,
  listDuesOutputSchema,
} from "@repo/services/due/model";
import { adminProcedure, residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Dues"];
const getPath = generatePath("/dues");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

function requireFlatId(flatId: string | null): string {
  if (!flatId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No flat assigned to this account" });
  }
  return flatId;
}

export const duesRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createDueInputSchema)
    .output(dueOutputSchema)
    .mutation(async ({ ctx, input }) => dueService.create(requireSocietyId(ctx.user.societyId), input)),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listDuesOutputSchema)
    .query(async ({ ctx }) => dueService.listForAdmin(requireSocietyId(ctx.user.societyId))),

  mine: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listDuesOutputSchema)
    .query(async ({ ctx }) => dueService.listForFlat(requireFlatId(ctx.user.flatId))),

  payMock: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/pay-mock"), tags: TAGS } })
    .input(dueIdInputSchema)
    .output(dueOutputSchema)
    .mutation(async ({ ctx, input }) => dueService.payMock(requireFlatId(ctx.user.flatId), input.dueId)),
});
