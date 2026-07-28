import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { adminRouter } from "./routes/admin/route";
import { towersRouter } from "./routes/towers/route";
import { flatsRouter } from "./routes/flats/route";
import { residentsRouter } from "./routes/residents/route";
import { visitorsRouter } from "./routes/visitors/route";
import { noticesRouter } from "./routes/notices/route";
import { pollsRouter } from "./routes/polls/route";
import { complaintsRouter } from "./routes/complaints/route";
import { amenitiesRouter } from "./routes/amenities/route";
import { amenityBookingsRouter } from "./routes/amenity-bookings/route";
import { duesRouter } from "./routes/dues/route";
import { staffDirectoryRouter } from "./routes/staff-directory/route";
import { notificationsRouter } from "./routes/notifications/route";
import { pushTokensRouter } from "./routes/push-tokens/route";
import { postsRouter } from "./routes/posts/route";
import { alertsRouter } from "./routes/alerts/route";
import { serviceRequestsRouter } from "./routes/service-requests/route";
import { chatRouter } from "./routes/chat/route";
import { dutyRouter } from "./routes/duty/route";
import { vehiclesRouter } from "./routes/vehicles/route";
import { moderationRouter } from "./routes/moderation/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  admin: adminRouter,
  towers: towersRouter,
  flats: flatsRouter,
  residents: residentsRouter,
  visitors: visitorsRouter,
  notices: noticesRouter,
  polls: pollsRouter,
  complaints: complaintsRouter,
  amenities: amenitiesRouter,
  amenityBookings: amenityBookingsRouter,
  dues: duesRouter,
  staffDirectory: staffDirectoryRouter,
  notifications: notificationsRouter,
  pushTokens: pushTokensRouter,
  posts: postsRouter,
  alerts: alertsRouter,
  serviceRequests: serviceRequestsRouter,
  chat: chatRouter,
  duty: dutyRouter,
  vehicles: vehiclesRouter,
  moderation: moderationRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
