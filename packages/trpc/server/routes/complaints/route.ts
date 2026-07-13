import { TRPCError } from "@trpc/server";
import { complaintService } from "../../services";
import {
  listComplaintsInputSchema,
  updateComplaintInputSchema,
  complaintOutputSchema,
  listComplaintsOutputSchema,
} from "@repo/services/complaint/model";
import { adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Complaints"];
const getPath = generatePath("/complaints");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
  }
  return societyId;
}

// Resident-facing raise/comment procedures arrive in Phase 7.
export const complaintsRouter = router({
  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(listComplaintsInputSchema)
    .output(listComplaintsOutputSchema)
    .query(async ({ ctx, input }) => complaintService.listForAdmin(requireSocietyId(ctx.user.societyId), input.status)),

  update: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/update"), tags: TAGS } })
    .input(updateComplaintInputSchema)
    .output(complaintOutputSchema)
    .mutation(async ({ ctx, input }) => complaintService.update(requireSocietyId(ctx.user.societyId), input)),
});
