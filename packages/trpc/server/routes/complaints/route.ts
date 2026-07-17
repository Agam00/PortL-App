import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { complaintService, notificationService } from "../../services";
import {
  listComplaintsInputSchema,
  updateComplaintInputSchema,
  setComplaintStatusInputSchema,
  complaintOutputSchema,
  listComplaintsOutputSchema,
  createComplaintInputSchema,
  complaintIdInputSchema,
  addCommentInputSchema,
  complaintCommentOutputSchema,
  listCommentsOutputSchema,
} from "@repo/services/complaint/model";
import { adminProcedure, residentProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Complaints"];
const getPath = generatePath("/complaints");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
  }
  return societyId;
}

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
    .mutation(async ({ ctx, input }) => {
      const updated = await complaintService.update(requireSocietyId(ctx.user.societyId), input);
      if (input.status) {
        await notificationService.notifyComplaintStatusChanged(input.complaintId);
      }
      return updated;
    }),

  create: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createComplaintInputSchema)
    .output(complaintOutputSchema)
    .mutation(async ({ ctx, input }) => complaintService.create(requireSocietyId(ctx.user.societyId), ctx.user.sub, input)),

  mine: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listComplaintsOutputSchema)
    .query(async ({ ctx }) => complaintService.listMine(ctx.user.sub)),

  // Community board: every complaint in the resident's society, with comment counts + isMine.
  listForResident: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/community"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listComplaintsOutputSchema)
    .query(async ({ ctx }) => complaintService.listForResident(requireSocietyId(ctx.user.societyId), ctx.user.sub)),

  // Resident marks their own complaint resolved / re-opens it.
  setStatusMine: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/set-status"), tags: TAGS } })
    .input(setComplaintStatusInputSchema)
    .output(complaintOutputSchema)
    .mutation(async ({ ctx, input }) => complaintService.setStatusByRaiser(ctx.user.sub, input.complaintId, input.status)),

  listComments: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/comments"), tags: TAGS } })
    .input(complaintIdInputSchema)
    .output(listCommentsOutputSchema)
    .query(async ({ ctx, input }) => complaintService.listComments(input.complaintId, ctx.user.sub, ctx.user.role, ctx.user.societyId)),

  addComment: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/comments/add"), tags: TAGS } })
    .input(addCommentInputSchema)
    .output(complaintCommentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const comment = await complaintService.addComment(input.complaintId, ctx.user.sub, ctx.user.role, input.body, ctx.user.societyId);
      await notificationService.notifyComplaintComment(input.complaintId, ctx.user.sub);
      return comment;
    }),
});
