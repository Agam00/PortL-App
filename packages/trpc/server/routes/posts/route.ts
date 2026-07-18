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
import { residentProcedure, router } from "../../trpc";
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
  list: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/"), tags: TAGS } })
    .input(zodUndefinedModel)
    .output(listPostsOutputSchema)
    .query(async ({ ctx }) => postService.list(requireSocietyId(ctx.user.societyId), ctx.user.sub)),

  create: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/"), tags: TAGS } })
    .input(createPostInputSchema)
    .output(postOutputSchema)
    .mutation(async ({ ctx, input }) => postService.create(requireSocietyId(ctx.user.societyId), ctx.user.sub, input)),

  toggleLike: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/like"), tags: TAGS } })
    .input(postIdInputSchema)
    .output(z.object({ liked: z.boolean() }))
    .mutation(async ({ ctx, input }) => postService.toggleLike(ctx.user.sub, input.postId)),

  listComments: residentProcedure
    .meta({ openapi: { method: "GET", path: getPath("/comments"), tags: TAGS } })
    .input(postIdInputSchema)
    .output(listPostCommentsOutputSchema)
    .query(async ({ input }) => postService.listComments(input.postId)),

  addComment: residentProcedure
    .meta({ openapi: { method: "POST", path: getPath("/comments/add"), tags: TAGS } })
    .input(addPostCommentInputSchema)
    .output(postCommentOutputSchema)
    .mutation(async ({ ctx, input }) => postService.addComment(input.postId, ctx.user.sub, input.body)),
});
