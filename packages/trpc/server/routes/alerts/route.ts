import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { zodUndefinedModel } from "../../schema";
import { notificationService } from "../../services";
import { residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Alerts"];
const getPath = generatePath("/alerts");

// Quick-action "+" menu options → who gets notified + how it reads.
const ALERT_TYPES = {
  send_admin: { roles: ["admin"] as const, emergency: false, label: "Message" },
  send_security: { roles: ["guard"] as const, emergency: false, label: "Message" },
  fire: { roles: ["admin", "guard"] as const, emergency: true, label: "Fire Alert" },
  stuck_lift: { roles: ["admin", "guard"] as const, emergency: true, label: "Stuck in Lift" },
  animal_threat: { roles: ["admin", "guard"] as const, emergency: true, label: "Animal Threat" },
  visitor_threat: { roles: ["admin", "guard"] as const, emergency: true, label: "Visitor Threat" },
} as const;

const raiseAlertInputSchema = z.object({
  type: z.enum(["send_admin", "send_security", "fire", "stuck_lift", "animal_threat", "visitor_threat"]),
});

export const alertsRouter = router({
  raise: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/raise"), tags: TAGS } })
    .input(raiseAlertInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.societyId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
      }
      const config = ALERT_TYPES[input.type];
      await notificationService.notifyStaffAlert(ctx.user.societyId, ctx.user.sub, [...config.roles], {
        emergency: config.emergency,
        label: config.label,
      });
    }),
});
