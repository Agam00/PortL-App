import { zodUndefinedModel } from "../../schema";
import { notificationService } from "../../services";
import { notificationIdInputSchema, listNotificationsOutputSchema } from "@repo/services/notification/model";
import { protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Notifications"];
const getPath = generatePath("/notifications");

export const notificationsRouter = router({
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listNotificationsOutputSchema)
    .query(async ({ ctx }) => notificationService.listForUser(ctx.user.sub)),

  markRead: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/mark-read"), tags: TAGS } })
    .input(notificationIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await notificationService.markRead(ctx.user.sub, input.notificationId);
    }),

  markAllRead: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/mark-all-read"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx }) => {
      await notificationService.markAllRead(ctx.user.sub);
    }),
});
