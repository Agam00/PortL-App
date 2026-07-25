import { z, zodUndefinedModel } from "../../schema";
import { vehicleService } from "../../services";
import {
  createVehicleInputSchema,
  vehicleIdInputSchema,
  vehicleOutputSchema,
  listVehiclesOutputSchema,
} from "@repo/services/vehicle/model";
import { residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Vehicles"];
const getPath = generatePath("/vehicles");

export const vehiclesRouter = router({
  mine: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listVehiclesOutputSchema)
    .query(async ({ ctx }) => vehicleService.listMine(ctx.user.sub)),

  create: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createVehicleInputSchema)
    .output(vehicleOutputSchema)
    .mutation(async ({ ctx, input }) => vehicleService.create(ctx.user.sub, ctx.user.societyId, input)),

  delete: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(vehicleIdInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await vehicleService.delete(ctx.user.sub, input.vehicleId);
      return { success: true as const };
    }),
});
