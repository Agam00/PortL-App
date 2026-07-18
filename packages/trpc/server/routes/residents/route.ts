import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { residentService } from "../../services";
import { searchResidentsInputSchema, searchResidentsOutputSchema } from "@repo/services/resident/model";
import { guardProcedure, residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Residents"];
const getPath = generatePath("/residents");

export const residentsRouter = router({
  // Full admin residents management arrives in Phase 6.
  search: guardProcedure
    .meta({ openapi: { method: "GET", path: getPath("/search"), tags: TAGS } })
    .input(searchResidentsInputSchema)
    .output(searchResidentsOutputSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.user.societyId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
      }
      return residentService.search(ctx.user.societyId, input.query);
    }),

  // Resident-facing phone directory — all residents in the society, grouped by flat.
  directory: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/directory"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(searchResidentsOutputSchema)
    .query(async ({ ctx }) => {
      if (!ctx.user.societyId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
      }
      return residentService.directory(ctx.user.societyId);
    }),
});
