import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { flatService } from "../../services";
import {
  createFlatInputSchema,
  updateFlatInputSchema,
  flatIdInputSchema,
  listFlatsInputSchema,
  flatOutputSchema,
  listFlatsOutputSchema,
} from "@repo/services/flat/model";
import { adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Flats"];
const getPath = generatePath("/flats");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

export const flatsRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createFlatInputSchema)
    .output(flatOutputSchema)
    .mutation(async ({ ctx, input }) => flatService.create(requireSocietyId(ctx.user.societyId), input)),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(listFlatsInputSchema)
    .output(listFlatsOutputSchema)
    .query(async ({ ctx, input }) => flatService.list(requireSocietyId(ctx.user.societyId), input.towerId)),

  update: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/update"), tags: TAGS } })
    .input(updateFlatInputSchema)
    .output(flatOutputSchema)
    .mutation(async ({ ctx, input }) => flatService.update(requireSocietyId(ctx.user.societyId), input)),

  remove: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(flatIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await flatService.remove(requireSocietyId(ctx.user.societyId), input.flatId);
    }),
});
