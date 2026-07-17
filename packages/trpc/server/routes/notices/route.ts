import { TRPCError } from "@trpc/server";
import { zodUndefinedModel } from "../../schema";
import { noticeService, notificationService } from "../../services";
import {
  createNoticeInputSchema,
  updateNoticeInputSchema,
  noticeIdInputSchema,
  noticeOutputSchema,
  listNoticesOutputSchema,
  listNoticesForResidentInputSchema,
  markNoticeReadInputSchema,
  reactNoticeInputSchema,
  addNoticeCommentInputSchema,
  noticeCommentOutputSchema,
  listNoticeCommentsOutputSchema,
} from "@repo/services/notice/model";
import { adminProcedure, residentProcedure, protectedProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Notices"];
const getPath = generatePath("/notices");

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

export const noticesRouter = router({
  create: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createNoticeInputSchema)
    .output(noticeOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const societyId = requireSocietyId(ctx.user.societyId);
      const notice = await noticeService.create(societyId, ctx.user.sub, input);
      await notificationService.notifyNoticePublished(societyId, notice);
      return notice;
    }),

  list: adminProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listNoticesOutputSchema)
    .query(async ({ ctx }) => noticeService.list(requireSocietyId(ctx.user.societyId))),

  update: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/update"), tags: TAGS } })
    .input(updateNoticeInputSchema)
    .output(noticeOutputSchema)
    .mutation(async ({ ctx, input }) => noticeService.update(requireSocietyId(ctx.user.societyId), input)),

  remove: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(noticeIdInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await noticeService.remove(requireSocietyId(ctx.user.societyId), input.noticeId);
    }),

  listForResident: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/mine"), tags: TAGS } })
    .input(listNoticesForResidentInputSchema)
    .output(listNoticesOutputSchema)
    .query(async ({ ctx, input }) => {
      const notices = await noticeService.listForResident(
        requireSocietyId(ctx.user.societyId),
        requireFlatId(ctx.user.flatId),
        ctx.user.sub,
        input,
      );
      const unreadIds = await notificationService.getUnreadNoticeIds(ctx.user.sub, notices.map((n) => n.id));
      return notices.map((notice) => ({ ...notice, isRead: !unreadIds.has(notice.id) }));
    }),

  markRead: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/mark-read"), tags: TAGS } })
    .input(markNoticeReadInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await notificationService.markNoticeRead(ctx.user.sub, input.noticeId);
    }),

  react: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/react"), tags: TAGS } })
    .input(reactNoticeInputSchema)
    .output(zodUndefinedModel)
    .mutation(async ({ ctx, input }) => {
      await noticeService.react(ctx.user.sub, input.noticeId, input.reaction);
    }),

  listComments: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/comments"), tags: TAGS } })
    .input(noticeIdInputSchema)
    .output(listNoticeCommentsOutputSchema)
    .query(async ({ input }) => noticeService.listComments(input.noticeId)),

  addComment: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/comments/add"), tags: TAGS } })
    .input(addNoticeCommentInputSchema)
    .output(noticeCommentOutputSchema)
    .mutation(async ({ ctx, input }) => noticeService.addComment(input.noticeId, ctx.user.sub, input.body)),
});
