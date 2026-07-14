import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { complaintService, notificationService } from "../../services";
import {
  listComplaintsInputSchema,
  updateComplaintInputSchema,
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
    throw new TRPCError({ code: "BAD_REQUEST", message: "Admin account has no society assigned" });
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

  listComments: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/comments"), tags: TAGS } })
    .input(complaintIdInputSchema)
    .output(listCommentsOutputSchema)
    .query(async ({ ctx, input }) => complaintService.listComments(input.complaintId, ctx.user.sub, ctx.user.role)),

  addComment: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/comments/add"), tags: TAGS } })
    .input(addCommentInputSchema)
    .output(complaintCommentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const comment = await complaintService.addComment(input.complaintId, ctx.user.sub, ctx.user.role, input.body);
      await notificationService.notifyComplaintComment(input.complaintId, ctx.user.sub);
      return comment;
    }),
});
