import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { dueService } from "../../services";
import {
  createDueInputSchema,
  createDueResultSchema,
  dueIdInputSchema,
  dueOutputSchema,
  dueProofOutputSchema,
  listDuesOutputSchema,
  paymentSettingsOutputSchema,
  setPaymentSettingsInputSchema,
  submitUpiPaymentInputSchema,
} from "@repo/services/due/model";
import { adminProcedure, residentProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Dues"];
const getPath = generatePath("/dues");

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

export const duesRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createDueInputSchema)
    .output(createDueResultSchema)
    .mutation(async ({ ctx, input }) => dueService.create(requireSocietyId(ctx.user.societyId), input)),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listDuesOutputSchema)
    .query(async ({ ctx }) => dueService.listForAdmin(requireSocietyId(ctx.user.societyId))),

  mine: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listDuesOutputSchema)
    .query(async ({ ctx }) => dueService.listForFlat(requireFlatId(ctx.user.flatId))),

  // ---- UPI collection settings ----
  paymentSettings: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/settings"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(paymentSettingsOutputSchema)
    .query(async ({ ctx }) => dueService.getPaymentSettings(requireSocietyId(ctx.user.societyId))),

  setPaymentSettings: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/settings"), tags: TAGS } })
    .input(setPaymentSettingsInputSchema)
    .output(paymentSettingsOutputSchema)
    .mutation(async ({ ctx, input }) =>
      dueService.setPaymentSettings(requireSocietyId(ctx.user.societyId), input),
    ),

  // Residents read the society's collection UPI to open their UPI app.
  collectionUpi: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/collection-upi"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(paymentSettingsOutputSchema)
    .query(async ({ ctx }) => dueService.getPaymentSettings(requireSocietyId(ctx.user.societyId))),

  // ---- Resident UPI payment ----
  submitUpiPayment: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/submit-upi"), tags: TAGS } })
    .input(submitUpiPaymentInputSchema)
    .output(dueOutputSchema)
    .mutation(async ({ ctx, input }) =>
      dueService.submitUpiPayment(requireFlatId(ctx.user.flatId), input.dueId, input.proofImage),
    ),

  // Admin views a resident's uploaded payment screenshot.
  proof: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/proof"), tags: TAGS } })
    .input(dueIdInputSchema)
    .output(dueProofOutputSchema)
    .query(async ({ ctx, input }) => dueService.getProof(requireSocietyId(ctx.user.societyId), input.dueId)),

  payMock: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/pay-mock"), tags: TAGS } })
    .input(dueIdInputSchema)
    .output(dueOutputSchema)
    .mutation(async ({ ctx, input }) => dueService.payMock(requireFlatId(ctx.user.flatId), input.dueId)),
});
