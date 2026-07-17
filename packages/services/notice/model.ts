import { z } from "zod";

export const noticeTargetScopeSchema = z.enum(["all", "tower", "flat"]);

export const createNoticeInputSchema = z.object({
  title: z.string().min(1).max(150),
  body: z.string().min(1),
  targetScope: noticeTargetScopeSchema,
  targetTowerId: z.string().uuid().optional(),
  targetFlatId: z.string().uuid().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateNoticeInputSchema = z.object({
  noticeId: z.string().uuid(),
  title: z.string().min(1).max(150).optional(),
  body: z.string().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const noticeIdInputSchema = z.object({
  noticeId: z.string().uuid(),
});

export const noticeReactionSchema = z.enum(["like", "dislike"]);

export const noticeOutputSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  targetScope: noticeTargetScopeSchema,
  targetTowerId: z.string().uuid().nullable(),
  targetTowerName: z.string().nullable(),
  targetFlatId: z.string().uuid().nullable(),
  targetFlatNumber: z.string().nullable(),
  authorName: z.string(),
  publishedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  isRead: z.boolean(),
  likeCount: z.number(),
  dislikeCount: z.number(),
  commentCount: z.number(),
  myReaction: noticeReactionSchema.nullable(),
});
export type NoticeOutput = z.infer<typeof noticeOutputSchema>;

export const listNoticesOutputSchema = z.array(noticeOutputSchema);

export const reactNoticeInputSchema = z.object({
  noticeId: z.string().uuid(),
  reaction: z.enum(["like", "dislike", "none"]),
});

export const addNoticeCommentInputSchema = z.object({
  noticeId: z.string().uuid(),
  body: z.string().min(1).max(1000),
});

export const noticeCommentOutputSchema = z.object({
  id: z.string().uuid(),
  noticeId: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  authorRole: z.enum(["resident", "guard", "admin"]),
  body: z.string(),
  createdAt: z.string().nullable(),
});
export type NoticeCommentOutput = z.infer<typeof noticeCommentOutputSchema>;

export const listNoticeCommentsOutputSchema = z.array(noticeCommentOutputSchema);

export const listNoticesForResidentInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
});

export const markNoticeReadInputSchema = z.object({
  noticeId: z.string().uuid(),
});
