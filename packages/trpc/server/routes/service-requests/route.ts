import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { serviceRequestService } from "../../services";
import {
  createServiceRequestInputSchema,
  serviceRequestIdInputSchema,
  serviceRequestOutputSchema,
  listServiceRequestsOutputSchema,
} from "@repo/services/service-request/model";
import { residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["ServiceRequests"];
const getPath = generatePath("/service-requests");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
  }
  return societyId;
}

export const serviceRequestsRouter = router({
  create: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createServiceRequestInputSchema)
    .output(serviceRequestOutputSchema)
    .mutation(async ({ ctx, input }) =>
      serviceRequestService.create(requireSocietyId(ctx.user.societyId), ctx.user.sub, input),
    ),

  mine: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listServiceRequestsOutputSchema)
    .query(async ({ ctx }) => serviceRequestService.mine(ctx.user.sub)),

  cancel: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/cancel"), tags: TAGS } })
    .input(serviceRequestIdInputSchema)
    .output(serviceRequestOutputSchema)
    .mutation(async ({ ctx, input }) => serviceRequestService.cancel(ctx.user.sub, input.requestId)),
});
