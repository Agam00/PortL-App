import { z } from "zod";

export const postOutputSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  flatNumber: z.string().nullable(),
  body: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
  likeCount: z.number(),
  commentCount: z.number(),
  isLiked: z.boolean(),
});
export type PostOutput = z.infer<typeof postOutputSchema>;

export const listPostsOutputSchema = z.array(postOutputSchema);

export const createPostInputSchema = z.object({
  body: z.string().min(1).max(2000),
  imageBase64: z
    .string()
    .max(2_000_000)
    .optional()
    .describe("data: URL, e.g. data:image/jpeg;base64,..."),
});

export const postIdInputSchema = z.object({
  postId: z.string().uuid(),
});

export const addPostCommentInputSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

export const postCommentOutputSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  flatNumber: z.string().nullable(),
  body: z.string(),
  createdAt: z.string().nullable(),
});
export type PostCommentOutput = z.infer<typeof postCommentOutputSchema>;

export const listPostCommentsOutputSchema = z.array(postCommentOutputSchema);
