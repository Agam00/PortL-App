import { z } from "zod";

export const adminMetricsOutputSchema = z.object({
  totalFlats: z.number(),
  occupiedFlats: z.number(),
  openComplaints: z.number(),
  pendingDues: z.number(),
  todayVisitorCount: z.number(),
  upcomingAmenityBookings: z.number(),
});
export type AdminMetrics = z.infer<typeof adminMetricsOutputSchema>;
