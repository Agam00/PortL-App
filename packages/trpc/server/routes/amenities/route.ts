import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { amenityService } from "../../services";
import {
  createAmenityInputSchema,
  updateAmenityInputSchema,
  amenityIdInputSchema,
  amenityOutputSchema,
  listAmenitiesOutputSchema,
} from "@repo/services/amenity/model";
import { adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Amenities"];
const getPath = generatePath("/amenities");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

// Resident-facing browse/book procedures arrive in Phase 8.
export const amenitiesRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createAmenityInputSchema)
    .output(amenityOutputSchema)
    .mutation(async ({ ctx, input }) => amenityService.create(requireSocietyId(ctx.user.societyId), input)),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listAmenitiesOutputSchema)
    .query(async ({ ctx }) => amenityService.list(requireSocietyId(ctx.user.societyId))),

  update: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/update"), tags: TAGS } })
    .input(updateAmenityInputSchema)
    .output(amenityOutputSchema)
    .mutation(async ({ ctx, input }) => amenityService.update(requireSocietyId(ctx.user.societyId), input)),

  remove: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(amenityIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await amenityService.remove(requireSocietyId(ctx.user.societyId), input.amenityId);
    }),
});
