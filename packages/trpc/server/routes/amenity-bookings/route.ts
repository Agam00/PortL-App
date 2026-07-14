import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { amenityBookingService } from "../../services";
import {
  availableSlotsInputSchema,
  listSlotsOutputSchema,
  createBookingInputSchema,
  bookingIdInputSchema,
  listBookingsForAdminInputSchema,
  bookingOutputSchema,
  listBookingsOutputSchema,
} from "@repo/services/amenity-booking/model";
import { adminProcedure, residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["AmenityBookings"];
const getPath = generatePath("/amenity-bookings");

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

export const amenityBookingsRouter = router({
  availableSlots: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/slots"), tags: TAGS } })
    .input(availableSlotsInputSchema)
    .output(listSlotsOutputSchema)
    .query(async ({ ctx, input }) =>
      amenityBookingService.availableSlots(requireSocietyId(ctx.user.societyId), input.amenityId, input.date),
    ),

  create: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createBookingInputSchema)
    .output(bookingOutputSchema)
    .mutation(async ({ ctx, input }) =>
      amenityBookingService.create(requireSocietyId(ctx.user.societyId), requireFlatId(ctx.user.flatId), ctx.user.sub, input),
    ),

  myBookings: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listBookingsOutputSchema)
    .query(async ({ ctx }) => amenityBookingService.myBookings(requireFlatId(ctx.user.flatId))),

  cancel: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/cancel"), tags: TAGS } })
    .input(bookingIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await amenityBookingService.cancel(requireFlatId(ctx.user.flatId), input.bookingId);
    }),

  listForAdmin: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(listBookingsForAdminInputSchema)
    .output(listBookingsOutputSchema)
    .query(async ({ ctx, input }) =>
      amenityBookingService.listForAdmin(requireSocietyId(ctx.user.societyId), input.amenityId, input.date),
    ),
});
