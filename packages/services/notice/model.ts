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
});
export type NoticeOutput = z.infer<typeof noticeOutputSchema>;

export const listNoticesOutputSchema = z.array(noticeOutputSchema);

export const listNoticesForResidentInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
});

export const markNoticeReadInputSchema = z.object({
  noticeId: z.string().uuid(),
});
