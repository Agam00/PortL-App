import { z } from "zod";

export const amenityBookingStatusSchema = z.enum(["confirmed", "cancelled"]);

export const availableSlotsInputSchema = z.object({
  amenityId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
});

export const slotOutputSchema = z.object({
  slotStart: z.string(),
  slotEnd: z.string(),
  bookedCount: z.number(),
  capacity: z.number(),
  isAvailable: z.boolean(),
});
export const listSlotsOutputSchema = z.array(slotOutputSchema);

export const createBookingInputSchema = z.object({
  amenityId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format"),
});

export const bookingIdInputSchema = z.object({
  bookingId: z.string().uuid(),
});

export const listBookingsForAdminInputSchema = z.object({
  amenityId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const bookingOutputSchema = z.object({
  id: z.string().uuid(),
  amenityId: z.string().uuid(),
  amenityName: z.string(),
  flatId: z.string().uuid(),
  flatNumber: z.string(),
  bookedByUserId: z.string().uuid(),
  bookedByName: z.string(),
  date: z.string(),
  slotStart: z.string(),
  slotEnd: z.string(),
  status: amenityBookingStatusSchema,
  createdAt: z.string().nullable(),
});
export type BookingOutput = z.infer<typeof bookingOutputSchema>;

export const listBookingsOutputSchema = z.array(bookingOutputSchema);
