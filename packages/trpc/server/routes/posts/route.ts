import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { zodUndefinedModel } from "../../schema";
import { postService } from "../../services";
import {
  createPostInputSchema,
  postIdInputSchema,
  addPostCommentInputSchema,
  postOutputSchema,
  listPostsOutputSchema,
  postCommentOutputSchema,
  listPostCommentsOutputSchema,
} from "@repo/services/post/model";
import { protectedProcedure, adminProcedure, router } from "../../trpc";
import { generatePath } from "../../utils/path-generator";

const TAGS = ["Posts"];
const getPath = generatePath("/posts");

function requireSocietyId(societyId: string | null): string {
  if (!societyId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No society assigned to this account" });
  }
  return societyId;
}

export const postsRouter = router({
  // Community feed is society-wide: residents, guards and admin all read/write it.
  list: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listPostsOutputSchema)
    .query(async ({ ctx }) => postService.list(requireSocietyId(ctx.user.societyId), ctx.user.sub)),

  create: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createPostInputSchema)
    .output(postOutputSchema)
    .mutation(async ({ ctx, input }) => postService.create(requireSocietyId(ctx.user.societyId), ctx.user.sub, input)),

  toggleLike: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/like"), tags: TAGS } })
    .input(postIdInputSchema)
    .output(z.object({ liked: z.boolean() }))
    .mutation(async ({ ctx, input }) => postService.toggleLike(ctx.user.sub, input.postId)),

  listComments: protectedProcedure
    .meta({ openapi: { method: "GET", path: getPath("/comments"), tags: TAGS } })
    .input(postIdInputSchema)
    .output(listPostCommentsOutputSchema)
    .query(async ({ input }) => postService.listComments(input.postId)),

  addComment: protectedProcedure
    .meta({ openapi: { method: "POST", path: getPath("/comments/add"), tags: TAGS } })
    .input(addPostCommentInputSchema)
    .output(postCommentOutputSchema)
    .mutation(async ({ ctx, input }) => postService.addComment(input.postId, ctx.user.sub, input.body)),

  // --- Admin moderation powers ---
  adminDeletePost: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/delete"), tags: TAGS } })
    .input(postIdInputSchema)
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await postService.deletePost(requireSocietyId(ctx.user.societyId), input.postId);
      return { success: true as const };
    }),

  adminDeleteComment: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/comments/delete"), tags: TAGS } })
    .input(z.object({ commentId: z.string().uuid() }))
    .output(z.object({ success: z.literal(true) }))
    .mutation(async ({ ctx, input }) => {
      await postService.deleteComment(requireSocietyId(ctx.user.societyId), input.commentId);
      return { success: true as const };
    }),

  setPinned: adminProcedure
    .meta({ openapi: { method: "POST", path: getPath("/pin"), tags: TAGS } })
    .input(z.object({ postId: z.string().uuid(), pinned: z.boolean() }))
    .output(z.object({ isPinned: z.boolean() }))
    .mutation(async ({ ctx, input }) => postService.setPinned(requireSocietyId(ctx.user.societyId), input.postId, input.pinned)),
});
