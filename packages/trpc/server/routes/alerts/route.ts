import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { zodUndefinedModel } from "../../schema";
import { notificationService } from "../../services";
import { listNotificationsOutputSchema } from "@repo/services/notification/model";
import { residentProcedure, guardProcedure, router } from "../../trpc";
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

// A guard's "report to admin" quick actions → label + whether it's urgent.
const GUARD_REPORT_TYPES = {
  incident: { label: "Security Incident", emergency: true },
  gate_issue: { label: "Gate / Equipment Issue", emergency: false },
  maintenance: { label: "Maintenance Needed", emergency: false },
  suspicious: { label: "Suspicious Activity", emergency: true },
  other: { label: "General Report", emergency: false },
} as const;

const guardReportInputSchema = z.object({
  type: z.enum(["incident", "gate_issue", "maintenance", "suspicious", "other"]),
  note: z.string().max(1000).optional(),
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

  // A resident's own history of alerts/messages they've raised, with timestamps.
  myHistory: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/history"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listNotificationsOutputSchema)
    .query(async ({ ctx }) => notificationService.residentAlertHistory(ctx.user.sub)),

  // Guard files a report/incident to the society admin(s).
  guardReport: guardProcedure
    .meta({ openapi: { method: "POST", path: getPath("/guard-report"), tags: TAGS } })
    .input(guardReportInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.societyId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
      }
      const config = GUARD_REPORT_TYPES[input.type];
      await notificationService.notifyGuardReport(ctx.user.societyId, ctx.user.sub, {
        label: config.label,
        note: input.note ?? "",
        emergency: config.emergency,
      });
    }),
});
